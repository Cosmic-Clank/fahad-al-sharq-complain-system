"use server";

import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { Buffer } from "node:buffer";
import { buildUsageWorkbook, workbookToBase64, XLSX_MIME, type UsageXlsxRow } from "@/lib/xlsx-reports";
import { formatQty } from "@/lib/inventory-units";
import { round2 } from "@/lib/hr-payroll";
import { todayYmdDubai } from "@/lib/hr-dates";
import type { PdfResult } from "@/app/(auth)/dashboard/admin/hr/hrReportActions";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export interface UsageReportFilters {
	from?: string; // "YYYY-MM-DD"
	to?: string;
	building?: string;
}

async function requireInventoryAccess() {
	const session = await auth();
	const role = (session?.user as any)?.role;
	if (!session?.user?.id || (role !== "ADMIN" && role !== "INVENTORY_MANAGER")) return null;
	return { id: Number(session.user.id), role };
}

/** Aggregate complaint inventory usages into per-building, per-item rows. */
export async function getUsageByBuilding(filters: UsageReportFilters): Promise<UsageXlsxRow[]> {
	if (!(await requireInventoryAccess())) return [];
	const where: any = {};
	if (filters.from && YMD.test(filters.from)) {
		where.createdAt = { ...(where.createdAt ?? {}), gte: new Date(`${filters.from}T00:00:00`) };
	}
	if (filters.to && YMD.test(filters.to)) {
		where.createdAt = { ...(where.createdAt ?? {}), lte: new Date(`${filters.to}T23:59:59.999`) };
	}
	if (filters.building) {
		where.complaint = { buildingName: filters.building };
	}

	const usages = await prismaClient.complaintInventoryUsage.findMany({
		where,
		select: {
			quantityUsed: true,
			complaint: { select: { buildingName: true } },
			inventory: { select: { id: true, itemName: true, itemCode: true, category: true, unit: true, unitPrice: true } },
		},
	});

	const grouped = new Map<string, UsageXlsxRow>();
	for (const u of usages) {
		const building = u.complaint.buildingName;
		const key = `${building}|${u.inventory.id}`;
		let row = grouped.get(key);
		if (!row) {
			row = {
				buildingName: building,
				itemName: u.inventory.itemName,
				itemCode: u.inventory.itemCode,
				category: u.inventory.category,
				unit: u.inventory.unit,
				totalQuantity: 0,
				timesUsed: 0,
				estimatedCost: u.inventory.unitPrice !== null ? 0 : null,
			};
			grouped.set(key, row);
		}
		row.totalQuantity += u.quantityUsed;
		row.timesUsed += 1;
		if (row.estimatedCost !== null && u.inventory.unitPrice !== null) {
			row.estimatedCost += u.quantityUsed * u.inventory.unitPrice;
		}
	}

	return [...grouped.values()].sort((a, b) => a.buildingName.localeCompare(b.buildingName) || a.itemName.localeCompare(b.itemName));
}

/** Distinct building names that have any recorded inventory usage. */
export async function getUsageBuildingNames(): Promise<string[]> {
	if (!(await requireInventoryAccess())) return [];
	const usages = await prismaClient.complaintInventoryUsage.findMany({
		select: { complaint: { select: { buildingName: true } } },
	});
	return [...new Set(usages.map((u) => u.complaint.buildingName))].sort((a, b) => a.localeCompare(b));
}

export async function exportUsageByBuildingXlsx(filters: UsageReportFilters): Promise<PdfResult> {
	if (!(await requireInventoryAccess())) {
		return { success: false, message: "Not authorized to export reports." };
	}

	const rows = await getUsageByBuilding(filters);
	const parts = [
		filters.from || filters.to ? `${filters.from ?? "…"} to ${filters.to ?? "…"}` : "All time",
		filters.building ? `Building: ${filters.building}` : "All buildings",
	];
	const wb = buildUsageWorkbook(rows, parts.join(" · "));

	const suffix = filters.building ? `-${filters.building.replace(/[^a-zA-Z0-9-]/g, "_")}` : "";
	return { success: true, fileName: `inventory-usage-by-building${suffix}.xlsx`, base64: await workbookToBase64(wb), mime: XLSX_MIME };
}

// ─────────────────────── Detailed PDF export ───────────────────────

const A4W = 595.28;
const A4H = 841.89;
const MARGIN = 36;
const ink = rgb(0.12, 0.14, 0.18);
const subt = rgb(0.45, 0.48, 0.53);
const line = rgb(0.85, 0.87, 0.9);
const green = rgb(0.13, 0.55, 0.28);

/** Helvetica is WinAnsi-only — replace unsupported (e.g. Arabic) characters. */
function toWinAnsi(s: string): string {
	return s.replace(/[^\x20-\x7E]/g, "?");
}

/**
 * Detailed PDF: per building, an item summary table plus the full usage log —
 * every individual entry with date, quantity, employee, complaint and notes.
 */
export async function exportUsageByBuildingPdf(filters: UsageReportFilters): Promise<PdfResult> {
	const actor = await requireInventoryAccess();
	if (!actor) return { success: false, message: "Not authorized to export reports." };

	const where: any = {};
	if (filters.from && YMD.test(filters.from)) where.createdAt = { ...(where.createdAt ?? {}), gte: new Date(`${filters.from}T00:00:00`) };
	if (filters.to && YMD.test(filters.to)) where.createdAt = { ...(where.createdAt ?? {}), lte: new Date(`${filters.to}T23:59:59.999`) };
	if (filters.building) where.complaint = { buildingName: filters.building };

	const usages = await prismaClient.complaintInventoryUsage.findMany({
		where,
		orderBy: { createdAt: "asc" },
		select: {
			quantityUsed: true,
			notes: true,
			createdAt: true,
			employee: { select: { fullName: true } },
			complaint: { select: { id: true, buildingName: true, apartmentNumber: true, customerName: true } },
			inventory: { select: { id: true, itemName: true, itemCode: true, category: true, unit: true, unitPrice: true } },
		},
	});

	// Group detail entries per building, and build the per-item summaries
	const byBuilding = new Map<string, typeof usages>();
	for (const u of usages) {
		const b = u.complaint.buildingName;
		if (!byBuilding.has(b)) byBuilding.set(b, []);
		byBuilding.get(b)!.push(u);
	}
	const buildings = [...byBuilding.keys()].sort((a, b) => a.localeCompare(b));

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	let page: PDFPage = doc.addPage([A4W, A4H]);
	let y = A4H - MARGIN;

	const newPage = () => {
		page = doc.addPage([A4W, A4H]);
		y = A4H - MARGIN;
	};
	const ensure = (needed: number) => {
		if (y - needed < MARGIN) newPage();
	};
	const text = (t: string, x: number, size: number, opts?: { bold?: boolean; color?: ReturnType<typeof rgb> }) => {
		page.drawText(toWinAnsi(t), { x, y, size, font: opts?.bold ? fontBold : font, color: opts?.color ?? ink });
	};

	// ── Report header ──
	text("Fahad Al Sharq AC Systems LLC", MARGIN, 14, { bold: true });
	y -= 18;
	text("Inventory Usage by Building — Detailed Report", MARGIN, 11, { bold: true, color: subt });
	y -= 14;
	const rangeLabel = [
		filters.from || filters.to ? `Period: ${filters.from ?? "beginning"} to ${filters.to ?? "today"}` : "Period: all time",
		filters.building ? `Building: ${filters.building}` : "All buildings",
		`Generated: ${todayYmdDubai()}`,
	].join("  ·  ");
	text(rangeLabel, MARGIN, 9, { color: subt });
	y -= 8;
	page.drawLine({ start: { x: MARGIN, y }, end: { x: A4W - MARGIN, y }, thickness: 1, color: line });
	y -= 6;

	if (buildings.length === 0) {
		y -= 20;
		text("No inventory usage recorded for the selected filters.", MARGIN, 10, { color: subt });
	}

	let grandCost = 0;
	let grandEntries = 0;

	for (const building of buildings) {
		const entries = byBuilding.get(building)!;

		// Per-item summary for this building
		const itemSummary = new Map<number, { name: string; code: string | null; unit: string; qty: number; times: number; cost: number | null }>();
		for (const u of entries) {
			let s = itemSummary.get(u.inventory.id);
			if (!s) {
				s = { name: u.inventory.itemName, code: u.inventory.itemCode, unit: u.inventory.unit, qty: 0, times: 0, cost: u.inventory.unitPrice !== null ? 0 : null };
				itemSummary.set(u.inventory.id, s);
			}
			s.qty += u.quantityUsed;
			s.times += 1;
			if (s.cost !== null && u.inventory.unitPrice !== null) s.cost += u.quantityUsed * u.inventory.unitPrice;
		}
		const buildingCost = round2([...itemSummary.values()].reduce((sum, s) => sum + (s.cost ?? 0), 0));
		grandCost += buildingCost;
		grandEntries += entries.length;

		// Building band
		ensure(60);
		y -= 24;
		page.drawRectangle({ x: MARGIN, y: y - 6, width: A4W - 2 * MARGIN, height: 22, color: rgb(0.95, 0.96, 0.98), borderColor: line, borderWidth: 0.5 });
		text(building, MARGIN + 8, 11, { bold: true });
		const bandRight = `${entries.length} usage entr${entries.length === 1 ? "y" : "ies"}  ·  est. cost AED ${buildingCost.toFixed(2)}`;
		page.drawText(toWinAnsi(bandRight), { x: A4W - MARGIN - 8 - font.widthOfTextAtSize(bandRight, 9), y, size: 9, font, color: subt });
		y -= 22;

		// Item summary table
		text("Item summary", MARGIN + 4, 9.5, { bold: true, color: subt });
		y -= 14;
		for (const s of [...itemSummary.values()].sort((a, b) => a.name.localeCompare(b.name))) {
			ensure(14);
			const label = `${s.name}${s.code ? ` (${s.code})` : ""}`;
			text(`• ${label}`, MARGIN + 10, 9);
			const right = `${formatQty(s.qty, s.unit)}  ·  ${s.times}x  ·  ${s.cost !== null ? `AED ${round2(s.cost).toFixed(2)}` : "no price set"}`;
			page.drawText(toWinAnsi(right), { x: A4W - MARGIN - 10 - font.widthOfTextAtSize(right, 9), y, size: 9, font, color: ink });
			y -= 13;
		}

		// Usage log
		y -= 4;
		ensure(30);
		text("Usage log", MARGIN + 4, 9.5, { bold: true, color: subt });
		y -= 14;
		for (const u of entries) {
			ensure(u.notes ? 26 : 14);
			const date = u.createdAt.toISOString().slice(0, 10);
			const lineText = `${date}  —  ${u.inventory.itemName}: ${formatQty(u.quantityUsed, u.inventory.unit)}  ·  by ${u.employee.fullName}  ·  complaint #${u.complaint.id} (apt ${u.complaint.apartmentNumber}, ${u.complaint.customerName})`;
			text(lineText.length > 118 ? `${lineText.slice(0, 115)}...` : lineText, MARGIN + 10, 8.5);
			y -= 12;
			if (u.notes) {
				text(`   note: ${u.notes.length > 110 ? `${u.notes.slice(0, 107)}...` : u.notes}`, MARGIN + 14, 8, { color: subt });
				y -= 12;
			}
		}
	}

	// ── Grand total ──
	if (buildings.length > 0) {
		ensure(40);
		y -= 16;
		page.drawLine({ start: { x: MARGIN, y: y + 8 }, end: { x: A4W - MARGIN, y: y + 8 }, thickness: 1, color: line });
		text(`Total: ${buildings.length} building${buildings.length === 1 ? "" : "s"}, ${grandEntries} usage entries`, MARGIN, 10, { bold: true });
		const totalText = `Total estimated cost: AED ${round2(grandCost).toFixed(2)}`;
		page.drawText(toWinAnsi(totalText), { x: A4W - MARGIN - fontBold.widthOfTextAtSize(totalText, 10), y, size: 10, font: fontBold, color: green });
	}

	const bytes = await doc.save();
	const suffix = filters.building ? `-${filters.building.replace(/[^a-zA-Z0-9-]/g, "_")}` : "";
	return { success: true, fileName: `inventory-usage-detailed${suffix}.pdf`, base64: Buffer.from(bytes).toString("base64") };
}
