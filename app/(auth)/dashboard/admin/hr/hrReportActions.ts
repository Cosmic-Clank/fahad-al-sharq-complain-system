"use server";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { HR_STAFF_ROLES, canAccessHr } from "@/lib/hr-roles";
import { Buffer } from "node:buffer";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { daysInMonth, monthLabel, todayYmdDubai } from "@/lib/hr-dates";
import { computeLeaveSalary, computePayslip } from "@/lib/hr-payroll";
import { formatLeaveDate, LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from "@/lib/hr-leave";
import { buildAttendanceWorkbook, buildSalarySummaryWorkbook, workbookToBase64, XLSX_MIME } from "@/lib/xlsx-reports";
import { getSalarySummary } from "@/lib/hr-salary-summary";
import { getApprovedLeaveDays } from "@/lib/hr-leave-server";
import { describePenalty, JOINT_LETTER_TYPE_LABELS } from "@/lib/joint-letters";
import { isValidSignature } from "@/lib/signature-server";
import { toWinAnsi } from "@/lib/pdf-text";

export type PdfResult = { success: true; fileName: string; base64: string; mime?: string } | { success: false; message: string };

const A4W = 595.28;
const A4H = 841.89;
const M = 36;

const ink = rgb(0.12, 0.14, 0.18);
const subt = rgb(0.45, 0.48, 0.53);
const line = rgb(0.85, 0.87, 0.9);
const green = rgb(0.13, 0.55, 0.28);
const amber = rgb(0.75, 0.52, 0.05);
const red = rgb(0.78, 0.16, 0.16);


async function requireHrAccess() {
	const session = await auth();
	if (!session?.user?.id || !canAccessHr((session.user as any).role)) return null;
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

/** Excel version of the monthly attendance sheet. */
export async function exportAttendanceSheetXlsx(month: string): Promise<PdfResult> {
	const actor = await requireHrAccess();
	if (!actor) return { success: false, message: "Not authorized to export reports." };
	if (!/^\d{4}-\d{2}$/.test(month)) return { success: false, message: "Invalid month." };

	const [users, records] = await Promise.all([
		prismaClient.user.findMany({
			where: { role: { in: HR_STAFF_ROLES } },
			select: { id: true, fullName: true },
			orderBy: { fullName: "asc" },
		}),
		prismaClient.attendanceRecord.findMany({
			where: { date: { startsWith: month } },
			select: { userId: true, date: true, status: true, earlyLeaveReason: true },
		}),
	]);

	const byUser = new Map<number, Record<string, { status: string; earlyLeave: boolean }>>();
	for (const r of records) {
		if (!byUser.has(r.userId)) byUser.set(r.userId, {});
		byUser.get(r.userId)![r.date] = { status: r.status, earlyLeave: r.earlyLeaveReason !== null };
	}

	const leaveByKey = await getApprovedLeaveDays(month);
	const leaveByUser = new Map<number, Record<string, string>>();
	for (const [key, type] of Object.entries(leaveByKey)) {
		const [uid, date] = key.split("|");
		if (!leaveByUser.has(Number(uid))) leaveByUser.set(Number(uid), {});
		leaveByUser.get(Number(uid))![date] = type;
	}

	const wb = buildAttendanceWorkbook(
		month,
		users.map((u) => ({ fullName: u.fullName, records: byUser.get(u.id) ?? {}, leave: leaveByUser.get(u.id) }))
	);

	return { success: true, fileName: `attendance-${month}.xlsx`, base64: await workbookToBase64(wb), mime: XLSX_MIME };
}

export async function exportAttendanceSheetPdf(month: string): Promise<PdfResult> {
	const admin = await requireHrAccess();
	if (!admin) return { success: false, message: "Only admins can export reports." };
	if (!/^\d{4}-\d{2}$/.test(month)) return { success: false, message: "Invalid month." };

	const [users, records] = await Promise.all([
		prismaClient.user.findMany({
			where: { role: { in: HR_STAFF_ROLES } },
			select: { id: true, fullName: true },
			orderBy: { fullName: "asc" },
		}),
		prismaClient.attendanceRecord.findMany({
			where: { date: { startsWith: month } },
			select: { userId: true, date: true, status: true, earlyLeaveReason: true },
		}),
	]);

	const byKey = new Map(records.map((r) => [`${r.userId}|${r.date}`, r]));
	const leaveByKey = await getApprovedLeaveDays(month);
	const days = daysInMonth(month);
	const leaveBlue = rgb(0.03, 0.45, 0.68);

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
		drawHeader(page, fontBold, font, `Attendance Sheet — ${monthLabel(month)}`, `Generated ${todayYmdDubai()} by ${admin.name} · P = Present, L = Late, A = Absent, V = On leave, * = early leave`, W);

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
				const x = M + nameColW + i * cellW + cellW / 2 - 3;
				if (!rec) {
					if (leaveByKey[`${user.id}|${d}`]) page.drawText("V", { x, y, size: 8, font: fontBold, color: leaveBlue });
					return;
				}
				page.drawText(statusLetter(rec.status), { x, y, size: 8, font: fontBold, color: statusColor(rec.status) });
				if (rec.earlyLeaveReason) page.drawText("*", { x: x + 6, y: y + 2, size: 7, font, color: rgb(0.45, 0.2, 0.65) });
			});
		}
	}

	return finish(doc, `attendance-${month}.pdf`);
}

// ─────────────────────────── 2. Payslip ───────────────────────────

export async function exportPayslipPdf(userId: number, month: string): Promise<PdfResult> {
	const admin = await requireHrAccess();
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

// ─────────────────────────── 2b. Monthly salary summary (all employees) ───────────────────────────

export async function exportSalarySummaryXlsx(month: string): Promise<PdfResult> {
	const actor = await requireHrAccess();
	if (!actor) return { success: false, message: "Not authorized to export reports." };
	if (!/^\d{4}-\d{2}$/.test(month)) return { success: false, message: "Invalid month." };

	const wb = buildSalarySummaryWorkbook(await getSalarySummary(month));
	return { success: true, fileName: `salary-summary-${month}.xlsx`, base64: await workbookToBase64(wb), mime: XLSX_MIME };
}

export async function exportSalarySummaryPdf(month: string): Promise<PdfResult> {
	const actor = await requireHrAccess();
	if (!actor) return { success: false, message: "Not authorized to export reports." };
	if (!/^\d{4}-\d{2}$/.test(month)) return { success: false, message: "Invalid month." };

	const summary = await getSalarySummary(month);

	// Landscape A4
	const W = A4H;
	const H = A4W;
	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	// Column layout: name, 6 money columns, 3 attendance columns (all right-aligned except name)
	const cols = [
		{ label: "Employee", w: 180 },
		{ label: "Basic", w: 75 },
		{ label: "Allowances", w: 75 },
		{ label: "Bonuses", w: 75 },
		{ label: "Gross", w: 75 },
		{ label: "Deductions", w: 75 },
		{ label: "Net Pay", w: 75 },
		{ label: "Present", w: 46 },
		{ label: "Late", w: 46 },
		{ label: "Absent", w: 46 },
	];
	const colRight = cols.map((_, i) => M + cols.slice(0, i + 1).reduce((s, c) => s + c.w, 0) - 4);
	const rowH = 18;
	const perPage = 22;

	const drawRow = (page: PDFPage, y: number, cells: string[], bold: boolean, colors: ReturnType<typeof rgb>[] = []) => {
		cells.forEach((text, i) => {
			const f = bold ? fontBold : font;
			const t = toWinAnsi(text);
			const x = i === 0 ? M + 4 : colRight[i] - f.widthOfTextAtSize(t, 9);
			page.drawText(t, { x, y, size: 9, font: f, color: colors[i] ?? ink });
		});
	};
	const cellsFor = (name: string, v: typeof summary.totals) => [
		name,
		...[v.basic, v.allowances, v.bonuses, v.gross].map((n) => n.toFixed(2)),
		v.deductions ? `-${v.deductions.toFixed(2)}` : "0.00",
		v.net.toFixed(2),
		String(v.present),
		String(v.late),
		String(v.absent),
	];
	// Deductions / late / absent only stand out when non-zero
	const colorsFor = (v: typeof summary.totals) => [ink, ink, ink, ink, ink, v.deductions ? red : ink, green, ink, v.late ? amber : ink, v.absent ? red : ink];

	const pageCount = Math.max(1, Math.ceil(summary.rows.length / perPage));
	for (let p = 0; p < pageCount; p++) {
		const page = doc.addPage([W, H]);
		drawHeader(page, fontBold, font, `Monthly Salary Summary — ${monthLabel(month)}`, `Generated ${todayYmdDubai()} by ${actor.name} · Amounts in AED · Page ${p + 1} of ${pageCount}`, W);

		let y = H - M - 80;
		drawRow(page, y, cols.map((c) => c.label), true, cols.map(() => subt));
		y -= 6;
		page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: line });

		for (const row of summary.rows.slice(p * perPage, (p + 1) * perPage)) {
			y -= rowH;
			drawRow(page, y, cellsFor((row.hasProfile ? row.fullName : `${row.fullName} *`).slice(0, 34), row), false, colorsFor(row));
			page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.5, color: line });
		}

		if (p === pageCount - 1) {
			y -= rowH + 4;
			page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: rowH, color: rgb(0.95, 0.96, 0.97) });
			drawRow(page, y, cellsFor(`TOTAL (${summary.rows.length} employees)`, summary.totals), true, colorsFor(summary.totals));
			if (summary.rows.some((r) => !r.hasProfile)) {
				page.drawText("* No HR profile — salary fields are 0.", { x: M, y: y - 28, size: 8, font, color: subt });
			}
		}
	}

	return finish(doc, `salary-summary-${month}.pdf`);
}

// ─────────────────────────── 3. Accounting clearance form ───────────────────────────

export async function exportClearancePdf(userId: number): Promise<PdfResult> {
	const admin = await requireHrAccess();
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
	const admin = await requireHrAccess();
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

	const drawSignature = async (title: string, dataUrl: string | null, x: number, yTop: number, dateLabel?: string) => {
		const boxW = (A4W - 2 * M - 20) / 2;
		const boxH = 90;
		page.drawRectangle({ x, y: yTop - boxH, width: boxW, height: boxH, borderColor: line, borderWidth: 1 });
		page.drawText(title, { x: x + 8, y: yTop - 16, size: 8.5, font: fontBold, color: subt });
		if (dateLabel) {
			// Top-right corner, clear of the signature image (which stays below yTop - 22)
			const w = font.widthOfTextAtSize(dateLabel, 8.5);
			page.drawText(dateLabel, { x: x + boxW - 8 - w, y: yTop - 16, size: 8.5, font, color: ink });
		}
		if (dataUrl) {
			try {
				let b64 = dataUrl;
				if (b64.startsWith("data:")) b64 = b64.split(",")[1];
				// pdf-lib hangs on corrupt PNGs, so stored data is checked before embedding
				if (!isValidSignature(`data:image/png;base64,${b64}`)) throw new Error("Invalid signature image");
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
	// Blank line when not yet returned so it can be filled in by hand on a printed copy
	const returnDate = `Return date: ${handover.returnedAt ? todayYmdDubai(handover.returnedAt) : "____________"}`;
	await drawSignature("Employee", handover.employeeSignatureReturnBase64, M, y, returnDate);
	await drawSignature("Admin", handover.adminSignatureReturnBase64, M + (A4W - 2 * M - 20) / 2 + 20, y, returnDate);

	return finish(doc, `passport-handover-${handover.id}-${handover.user.username}.pdf`);
}

// ─────────────────────────── 5. Leave request form ───────────────────────────

export async function exportLeavePdf(leaveId: number): Promise<PdfResult> {
	const admin = await requireHrAccess();
	if (!admin) return { success: false, message: "Only admins can export reports." };

	const leave = await prismaClient.leaveRequest.findUnique({
		where: { id: leaveId },
		include: { user: { select: { fullName: true, username: true, employeeProfile: { select: { joiningDate: true } } } } },
	});
	if (!leave) return { success: false, message: "Leave request not found." };

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const page = doc.addPage([A4W, A4H]);

	drawHeader(page, fontBold, font, `Leave Request Form #${leave.id}`, `Employee: ${leave.user.fullName} (@${leave.user.username}) · Status: ${LEAVE_STATUS_LABELS[leave.status] ?? leave.status}`, A4W);

	let y = A4H - M - 90;
	const row = (label: string, value: string) => {
		y -= 18;
		page.drawText(label, { x: M + 6, y, size: 9.5, font, color: subt });
		page.drawText(toWinAnsi(value), { x: M + 170, y, size: 9.5, font: fontBold, color: ink });
	};
	const joining = leave.user.employeeProfile?.joiningDate;

	row("Type of leave", LEAVE_TYPE_LABELS[leave.type] ?? leave.type);
	row("From", formatLeaveDate(leave.startDate));
	row("To", formatLeaveDate(leave.endDate));
	row("Number of days", `${leave.days} calendar day${leave.days === 1 ? "" : "s"}`);
	if (leave.reason) row("Reason", leave.reason.replace(/\s+/g, " ").slice(0, 70));
	row("Joining date", joining ? todayYmdDubai(joining) : "Not on record");
	row(leave.createdByAdminName ? "Recorded by" : "Requested on", leave.createdByAdminName ?? todayYmdDubai(leave.createdAt));
	if (leave.decidedByName && (leave.status === "APPROVED" || leave.status === "REJECTED")) {
		row(leave.status === "APPROVED" ? "Approved by" : "Rejected by", `${leave.decidedByName}${leave.decidedAt ? ` on ${todayYmdDubai(leave.decidedAt)}` : ""}`);
	}
	if (leave.decisionNote) row("Note", leave.decisionNote.replace(/\s+/g, " ").slice(0, 70));

	y -= 40;
	if (!leave.signatureRequired) {
		page.drawText("Signatures not required: the employee had less than 2 years of service when this leave was requested.", { x: M, y, size: 9.5, font, color: subt });
		return finish(doc, `leave-${leave.id}-${leave.user.username}.pdf`);
	}

	page.drawText("Signatures (required: 2+ years of service or joining date not on record)", { x: M, y, size: 10.5, font: fontBold, color: ink });
	y -= 10;

	const boxW = (A4W - 2 * M - 20) / 2;
	const boxH = 90;
	const drawSignature = async (title: string, dataUrl: string | null, x: number, dateLabel: string) => {
		page.drawRectangle({ x, y: y - boxH, width: boxW, height: boxH, borderColor: line, borderWidth: 1 });
		page.drawText(title, { x: x + 8, y: y - 16, size: 8.5, font: fontBold, color: subt });
		const w = font.widthOfTextAtSize(dateLabel, 8.5);
		page.drawText(dateLabel, { x: x + boxW - 8 - w, y: y - 16, size: 8.5, font, color: ink });
		if (!dataUrl) {
			page.drawText("(not signed)", { x: x + 8, y: y - boxH / 2, size: 8, font, color: subt });
			return;
		}
		try {
			if (!isValidSignature(dataUrl)) throw new Error("Invalid signature image");
			const img = await doc.embedPng(Buffer.from(dataUrl.split(",")[1] ?? "", "base64"));
			const scale = Math.min((boxW - 20) / img.width, (boxH - 30) / img.height);
			page.drawImage(img, { x: x + 10, y: y - boxH + 8, width: img.width * scale, height: img.height * scale });
		} catch {
			page.drawText("(signature could not be rendered)", { x: x + 8, y: y - boxH / 2, size: 8, font, color: subt });
		}
	};

	const signedOn = (d: Date | null) => `Date: ${d ? todayYmdDubai(d) : "____________"}`;
	// Employee signs when requesting (or on HR's screen when recorded); admin signs when deciding
	await drawSignature("Employee", leave.employeeSignatureBase64, M, signedOn(leave.employeeSignatureBase64 ? (leave.createdByAdminName ? leave.decidedAt : leave.createdAt) : null));
	await drawSignature("Admin", leave.adminSignatureBase64, M + boxW + 20, signedOn(leave.adminSignatureBase64 ? leave.decidedAt : null));

	return finish(doc, `leave-${leave.id}-${leave.user.username}.pdf`);
}

// ─────────────────────────── 6. Joint letter ───────────────────────────

/** Greedy word-wrap of one paragraph to a max width (long words are hard-split). */
function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let current = "";
	for (let word of words) {
		while (font.widthOfTextAtSize(word, size) > maxWidth) {
			let cut = word.length - 1;
			while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut--;
			if (current) {
				lines.push(current);
				current = "";
			}
			lines.push(word.slice(0, cut));
			word = word.slice(cut);
		}
		const candidate = current ? `${current} ${word}` : word;
		if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
		else {
			lines.push(current);
			current = word;
		}
	}
	lines.push(current);
	return lines;
}

export async function exportJointLetterPdf(letterId: number): Promise<PdfResult> {
	const admin = await requireHrAccess();
	if (!admin) return { success: false, message: "Only admins can export reports." };

	const letter = await prismaClient.jointLetter.findUnique({
		where: { id: letterId },
		include: {
			user: { select: { fullName: true, username: true } },
			penalty: { select: { type: true, amount: true, effectiveMonth: true, details: true } },
		},
	});
	if (!letter) return { success: false, message: "Joint letter not found." };

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const contentW = A4W - 2 * M;

	let page = doc.addPage([A4W, A4H]);
	drawHeader(page, fontBold, font, `${JOINT_LETTER_TYPE_LABELS[letter.type] ?? letter.type} #${letter.id}`, `Joint letter · Date: ${formatLeaveDate(letter.letterDate)}`, A4W);
	let y = A4H - M - 92;
	const ensure = (needed: number) => {
		if (y - needed < M) {
			page = doc.addPage([A4W, A4H]);
			y = A4H - M;
		}
	};
	// Long values (subject up to 150 chars, penalty details) wrap under the label instead of running off the page
	const field = (label: string, value: string) => {
		page.drawText(label, { x: M, y, size: 10, font, color: subt });
		for (const text of wrapLine(toWinAnsi(value), fontBold, 10, contentW - 70)) {
			page.drawText(text, { x: M + 70, y, size: 10, font: fontBold, color: ink });
			y -= 14;
		}
		y -= 2;
	};

	field("To:", `${letter.user.fullName} (@${letter.user.username})`);
	field("Subject:", letter.subject);
	if (letter.penalty) field("Penalty:", describePenalty(letter.penalty));
	y -= 14;

	// Body — paragraphs kept, long lines wrapped, continues onto new pages
	const size = 10.5;
	const leading = 15;
	for (const paragraph of letter.body.replace(/\r\n/g, "\n").split("\n")) {
		if (!paragraph.trim()) {
			y -= leading * 0.6;
			continue;
		}
		for (const text of wrapLine(toWinAnsi(paragraph), font, size, contentW)) {
			ensure(leading);
			page.drawText(text, { x: M, y, size, font, color: ink });
			y -= leading;
		}
	}

	// Signatures (kept together on one page)
	const boxW = (contentW - 20) / 2;
	const boxH = 90;
	ensure(boxH + 50);
	y -= 30;
	page.drawText("Signatures", { x: M, y, size: 10.5, font: fontBold, color: ink });
	y -= 10;
	const signedOn = `Date: ${letter.signedAt ? todayYmdDubai(letter.signedAt) : "____________"}`;
	const drawSignature = async (title: string, dataUrl: string | null, x: number) => {
		page.drawRectangle({ x, y: y - boxH, width: boxW, height: boxH, borderColor: line, borderWidth: 1 });
		page.drawText(title, { x: x + 8, y: y - 16, size: 8.5, font: fontBold, color: subt });
		const w = font.widthOfTextAtSize(signedOn, 8.5);
		page.drawText(signedOn, { x: x + boxW - 8 - w, y: y - 16, size: 8.5, font, color: ink });
		if (!dataUrl) return; // unsigned: blank box to sign on paper
		try {
			if (!isValidSignature(dataUrl)) throw new Error("Invalid signature image");
			const img = await doc.embedPng(Buffer.from(dataUrl.split(",")[1] ?? "", "base64"));
			const scale = Math.min((boxW - 20) / img.width, (boxH - 30) / img.height);
			page.drawImage(img, { x: x + 10, y: y - boxH + 8, width: img.width * scale, height: img.height * scale });
		} catch {
			page.drawText("(signature could not be rendered)", { x: x + 8, y: y - boxH / 2, size: 8, font, color: subt });
		}
	};
	await drawSignature(`Employee — ${toWinAnsi(letter.user.fullName).slice(0, 28)}`, letter.employeeSignatureBase64, M);
	await drawSignature(`For the company — ${toWinAnsi(letter.signedByAdminName ?? letter.createdByName).slice(0, 22)}`, letter.adminSignatureBase64, M + boxW + 20);

	return finish(doc, `joint-letter-${letter.id}-${letter.user.username}.pdf`);
}
