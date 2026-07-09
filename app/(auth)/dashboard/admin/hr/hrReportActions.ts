"use server";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { Buffer } from "node:buffer";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { daysInMonth, monthLabel, currentMonthDubai, todayYmdDubai } from "@/lib/hr-dates";
import { computeLeaveSalary, computePayslip } from "@/lib/hr-payroll";

export type PdfResult = { success: true; fileName: string; base64: string } | { success: false; message: string };

const A4W = 595.28;
const A4H = 841.89;
const M = 36;

const ink = rgb(0.12, 0.14, 0.18);
const subt = rgb(0.45, 0.48, 0.53);
const line = rgb(0.85, 0.87, 0.9);
const green = rgb(0.13, 0.55, 0.28);
const amber = rgb(0.75, 0.52, 0.05);
const red = rgb(0.78, 0.16, 0.16);

/** Helvetica is WinAnsi-only — replace unsupported (e.g. Arabic) characters. */
function toWinAnsi(s: string): string {
	return s.replace(/[^\x20-\x7E]/g, "?");
}

async function requireAdmin() {
	const session = await auth();
	if (!session?.user?.id || (session.user as any).role !== "ADMIN") return null;
	return { id: Number(session.user.id), name: session.user.name ?? "Admin" };
}

function drawHeader(page: PDFPage, fontBold: PDFFont, font: PDFFont, title: string, subtitle: string, pageW: number) {
	page.drawText("Fahad Al Sharq AC Systems LLC", { x: M, y: page.getHeight() - M - 10, size: 14, font: fontBold, color: ink });
	page.drawText(toWinAnsi(title), { x: M, y: page.getHeight() - M - 32, size: 11, font: fontBold, color: subt });
	page.drawText(toWinAnsi(subtitle), { x: M, y: page.getHeight() - M - 47, size: 9, font, color: subt });
	page.drawLine({ start: { x: M, y: page.getHeight() - M - 56 }, end: { x: pageW - M, y: page.getHeight() - M - 56 }, thickness: 1, color: line });
}

function finish(doc: PDFDocument, fileName: string): Promise<PdfResult> {
	return doc.save().then((bytes) => ({ success: true as const, fileName, base64: Buffer.from(bytes).toString("base64") }));
}

// ─────────────────────────── 1. Attendance sheet ───────────────────────────

export async function exportAttendanceSheetPdf(month: string): Promise<PdfResult> {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can export reports." };
	if (!/^\d{4}-\d{2}$/.test(month)) return { success: false, message: "Invalid month." };

	const [users, records] = await Promise.all([
		prismaClient.user.findMany({
			where: { role: { in: ["EMPLOYEE", "INVENTORY_MANAGER"] } },
			select: { id: true, fullName: true },
			orderBy: { fullName: "asc" },
		}),
		prismaClient.attendanceRecord.findMany({
			where: { date: { startsWith: month } },
			select: { userId: true, date: true, status: true, earlyLeaveReason: true },
		}),
	]);

	const byKey = new Map(records.map((r) => [`${r.userId}|${r.date}`, r]));
	const days = daysInMonth(month);

	// Landscape A4
	const W = A4H;
	const H = A4W;
	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	const nameColW = 110;
	const cellW = (W - 2 * M - nameColW) / days.length;
	const rowH = 16;
	const perPage = 24;

	const statusColor = (s: string) => (s === "PRESENT" ? green : s === "LATE" ? amber : red);
	const statusLetter = (s: string) => (s === "PRESENT" ? "P" : s === "LATE" ? "L" : "A");

	for (let start = 0; start < Math.max(users.length, 1); start += perPage) {
		const page = doc.addPage([W, H]);
		drawHeader(page, fontBold, font, `Attendance Sheet — ${monthLabel(month)}`, `Generated ${todayYmdDubai()} by ${admin.name} · P = Present, L = Late, A = Absent, * = early leave`, W);

		let y = H - M - 76;
		// Day header row
		days.forEach((d, i) => {
			page.drawText(String(Number(d.slice(8))), { x: M + nameColW + i * cellW + cellW / 2 - 3, y, size: 6, font: fontBold, color: subt });
		});
		y -= 6;

		for (const user of users.slice(start, start + perPage)) {
			y -= rowH;
			page.drawLine({ start: { x: M, y: y - 4 }, end: { x: W - M, y: y - 4 }, thickness: 0.5, color: line });
			const name = toWinAnsi(user.fullName).slice(0, 24);
			page.drawText(name, { x: M, y, size: 8, font, color: ink });
			days.forEach((d, i) => {
				const rec = byKey.get(`${user.id}|${d}`);
				if (!rec) return;
				const x = M + nameColW + i * cellW + cellW / 2 - 3;
				page.drawText(statusLetter(rec.status), { x, y, size: 8, font: fontBold, color: statusColor(rec.status) });
				if (rec.earlyLeaveReason) page.drawText("*", { x: x + 6, y: y + 2, size: 7, font, color: rgb(0.45, 0.2, 0.65) });
			});
		}
	}

	return finish(doc, `attendance-${month}.pdf`);
}

// ─────────────────────────── 2. Payslip ───────────────────────────

export async function exportPayslipPdf(userId: number, month: string): Promise<PdfResult> {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can export reports." };
	if (!/^\d{4}-\d{2}$/.test(month)) return { success: false, message: "Invalid month." };

	const [user, profile, bonuses, penalties] = await Promise.all([
		prismaClient.user.findUnique({ where: { id: userId }, select: { fullName: true, username: true } }),
		prismaClient.employeeProfile.findUnique({ where: { userId } }),
		prismaClient.bonus.findMany({ where: { userId, month }, select: { amount: true, note: true } }),
		prismaClient.penalty.findMany({ where: { userId, effectiveMonth: month }, select: { type: true, amount: true, details: true, isAutomatic: true } }),
	]);
	if (!user) return { success: false, message: "Employee not found." };

	const payslip = computePayslip({ basicSalary: profile?.basicSalary ?? 0, allowances: profile?.allowances ?? 0, bonuses, penalties });

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const page = doc.addPage([A4W, A4H]);

	drawHeader(page, fontBold, font, `Payslip — ${monthLabel(month)}`, `Employee: ${user.fullName} (@${user.username}) · Generated ${todayYmdDubai()}`, A4W);

	let y = A4H - M - 90;
	const amountX = A4W - M - 90;

	page.drawText("Description", { x: M, y, size: 10, font: fontBold, color: subt });
	page.drawText("Amount (AED)", { x: amountX, y, size: 10, font: fontBold, color: subt });
	y -= 8;
	page.drawLine({ start: { x: M, y }, end: { x: A4W - M, y }, thickness: 1, color: line });

	for (const l of payslip.lines) {
		y -= 20;
		page.drawText(toWinAnsi(l.label).slice(0, 80), { x: M, y, size: 10, font, color: l.kind === "deduction" ? red : ink });
		const text = `${l.kind === "deduction" ? "-" : ""}${l.amount.toFixed(2)}`;
		page.drawText(text, { x: amountX, y, size: 10, font, color: l.kind === "deduction" ? red : ink });
	}

	y -= 12;
	page.drawLine({ start: { x: M, y }, end: { x: A4W - M, y }, thickness: 1, color: line });
	y -= 20;
	page.drawText("Gross (basic + allowances + bonuses)", { x: M, y, size: 10, font: fontBold, color: ink });
	page.drawText(payslip.gross.toFixed(2), { x: amountX, y, size: 10, font: fontBold, color: ink });
	y -= 20;
	page.drawText("Total deductions", { x: M, y, size: 10, font: fontBold, color: red });
	page.drawText(`-${payslip.totalDeductions.toFixed(2)}`, { x: amountX, y, size: 10, font: fontBold, color: red });

	y -= 34;
	page.drawRectangle({ x: M, y: y - 8, width: A4W - 2 * M, height: 30, color: rgb(0.9, 0.97, 0.92), borderColor: green, borderWidth: 1 });
	page.drawText("NET PAY", { x: M + 10, y, size: 12, font: fontBold, color: green });
	page.drawText(`AED ${payslip.net.toFixed(2)}`, { x: amountX - 20, y, size: 12, font: fontBold, color: green });

	y -= 70;
	page.drawText("Employee signature: ____________________", { x: M, y, size: 9, font, color: subt });
	page.drawText("Accountant signature: ____________________", { x: A4W / 2 + 10, y, size: 9, font, color: subt });

	return finish(doc, `payslip-${user.username}-${month}.pdf`);
}

// ─────────────────────────── 3. Accounting clearance form ───────────────────────────

export async function exportClearancePdf(userId: number): Promise<PdfResult> {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can export reports." };

	const [user, profile, penalties, bonuses] = await Promise.all([
		prismaClient.user.findUnique({ where: { id: userId }, select: { fullName: true, username: true } }),
		prismaClient.employeeProfile.findUnique({ where: { userId } }),
		prismaClient.penalty.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
		prismaClient.bonus.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
	]);
	if (!user) return { success: false, message: "Employee not found." };

	const leave = computeLeaveSalary(
		{ basicSalary: profile?.basicSalary ?? 0, joiningDate: profile?.joiningDate ?? null, leaveSalaryOverride: profile?.leaveSalaryOverride ?? null },
		penalties.filter((p) => p.type === "LEAVE_SALARY_DEDUCTION" && p.amount !== null).map((p) => p.amount!)
	);

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const page = doc.addPage([A4W, A4H]);

	drawHeader(page, fontBold, font, "Accounting Clearance Form", `Employee: ${user.fullName} (@${user.username}) · Generated ${todayYmdDubai()} by ${admin.name}`, A4W);

	let y = A4H - M - 90;
	const section = (title: string) => {
		y -= 26;
		page.drawText(title, { x: M, y, size: 11, font: fontBold, color: ink });
		y -= 6;
		page.drawLine({ start: { x: M, y }, end: { x: A4W - M, y }, thickness: 0.75, color: line });
	};
	const row = (label: string, value: string, color = ink) => {
		y -= 18;
		page.drawText(toWinAnsi(label).slice(0, 70), { x: M + 6, y, size: 9.5, font, color: subt });
		page.drawText(toWinAnsi(value), { x: A4W - M - 130, y, size: 9.5, font: fontBold, color });
	};

	section("Current Salary");
	row("Basic salary", `AED ${(profile?.basicSalary ?? 0).toFixed(2)}`);
	row("Allowances", `AED ${(profile?.allowances ?? 0).toFixed(2)}`);
	row("Monthly total", `AED ${((profile?.basicSalary ?? 0) + (profile?.allowances ?? 0)).toFixed(2)}`);

	section("Leave Salary");
	row(leave.isOverridden ? "Accrued (admin override)" : `Accrued (${leave.completedYears} completed years x basic)`, `AED ${leave.accrued.toFixed(2)}`);
	row("Leave-salary deductions", `- AED ${leave.deducted.toFixed(2)}`, red);
	row("Balance", `AED ${leave.balance.toFixed(2)}`, green);

	section(`Penalties (${penalties.length})`);
	if (penalties.length === 0) row("None recorded", "-");
	for (const p of penalties.slice(0, 12)) {
		row(`${p.effectiveMonth} · ${p.type.replace(/_/g, " ").toLowerCase()} · by ${p.decidedBy}${p.isAutomatic ? " (auto)" : ""}`, p.amount !== null ? `- AED ${p.amount.toFixed(2)}` : "-", red);
	}
	if (penalties.length > 12) row(`… and ${penalties.length - 12} more`, "");

	section(`Bonuses (${bonuses.length})`);
	if (bonuses.length === 0) row("None recorded", "-");
	for (const b of bonuses.slice(0, 8)) {
		row(`${b.month}${b.note ? ` · ${b.note}` : ""}`, `+ AED ${b.amount.toFixed(2)}`, green);
	}
	if (bonuses.length > 8) row(`… and ${bonuses.length - 8} more`, "");

	y -= 60;
	page.drawText("Employee signature: ____________________", { x: M, y, size: 9, font, color: subt });
	page.drawText("Accountant signature: ____________________", { x: A4W / 2 + 10, y, size: 9, font, color: subt });
	y -= 24;
	page.drawText("Manager signature: ____________________", { x: M, y, size: 9, font, color: subt });
	page.drawText(`Date: ${todayYmdDubai()}`, { x: A4W / 2 + 10, y, size: 9, font, color: subt });

	return finish(doc, `clearance-${user.username}.pdf`);
}

// ─────────────────────────── 4. Passport handover form ───────────────────────────

export async function exportHandoverPdf(handoverId: number): Promise<PdfResult> {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can export reports." };

	const handover = await prismaClient.passportHandover.findUnique({
		where: { id: handoverId },
		include: { user: { select: { fullName: true, username: true } } },
	});
	if (!handover) return { success: false, message: "Handover not found." };

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const page = doc.addPage([A4W, A4H]);

	drawHeader(page, fontBold, font, `Passport Handover Form #${handover.id}`, `Employee: ${handover.user.fullName} (@${handover.user.username}) · Status: ${handover.status.replace(/_/g, " ")}`, A4W);

	let y = A4H - M - 90;
	const row = (label: string, value: string) => {
		y -= 18;
		page.drawText(label, { x: M + 6, y, size: 9.5, font, color: subt });
		page.drawText(toWinAnsi(value), { x: M + 170, y, size: 9.5, font: fontBold, color: ink });
	};

	row("Requested at", handover.requestedAt.toISOString().replace("T", " ").slice(0, 16));
	if (handover.requestReason) row("Reason", handover.requestReason.slice(0, 70));
	if (handover.approvedAt) row("Approved at", handover.approvedAt.toISOString().replace("T", " ").slice(0, 16));
	if (handover.handedOverAt) row("Handed over at", handover.handedOverAt.toISOString().replace("T", " ").slice(0, 16));
	if (handover.returnedAt) row("Returned at", handover.returnedAt.toISOString().replace("T", " ").slice(0, 16));
	if (handover.handledByAdminName) row("Handled by", handover.handledByAdminName);
	if (handover.notes) row("Notes", handover.notes.slice(0, 70));

	const drawSignature = async (title: string, dataUrl: string | null, x: number, yTop: number) => {
		const boxW = (A4W - 2 * M - 20) / 2;
		const boxH = 90;
		page.drawRectangle({ x, y: yTop - boxH, width: boxW, height: boxH, borderColor: line, borderWidth: 1 });
		page.drawText(title, { x: x + 8, y: yTop - 16, size: 8.5, font: fontBold, color: subt });
		if (dataUrl) {
			try {
				let b64 = dataUrl;
				if (b64.startsWith("data:")) b64 = b64.split(",")[1];
				const img = await doc.embedPng(Buffer.from(b64, "base64"));
				const scale = Math.min((boxW - 20) / img.width, (boxH - 30) / img.height);
				page.drawImage(img, { x: x + 10, y: yTop - boxH + 8, width: img.width * scale, height: img.height * scale });
			} catch {
				page.drawText("(signature could not be rendered)", { x: x + 8, y: yTop - boxH / 2, size: 8, font, color: subt });
			}
		} else {
			page.drawText("(not signed)", { x: x + 8, y: yTop - boxH / 2, size: 8, font, color: subt });
		}
	};

	y -= 40;
	page.drawText("Handover signatures (passport given to employee)", { x: M, y, size: 10.5, font: fontBold, color: ink });
	y -= 10;
	await drawSignature("Employee", handover.employeeSignatureHandoverBase64, M, y);
	await drawSignature("Admin", handover.adminSignatureHandoverBase64, M + (A4W - 2 * M - 20) / 2 + 20, y);
	y -= 120;

	page.drawText("Return signatures (passport back in company custody)", { x: M, y, size: 10.5, font: fontBold, color: ink });
	y -= 10;
	await drawSignature("Employee", handover.employeeSignatureReturnBase64, M, y);
	await drawSignature("Admin", handover.adminSignatureReturnBase64, M + (A4W - 2 * M - 20) / 2 + 20, y);

	return finish(doc, `passport-handover-${handover.id}-${handover.user.username}.pdf`);
}
