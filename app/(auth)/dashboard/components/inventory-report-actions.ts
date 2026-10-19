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
import { makeBuildingResolver, STOCK_LABEL } from "@/lib/inventory-request-building";

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

interface UsageEntry {
	date: Date;
	building: string; // STOCK_LABEL when not tied to a building
	location: string | null;
	quantity: number;
	inventory: { id: number; itemName: string; itemCode: string | null; category: string | null; unit: string; unitPrice: number | null };
	/** "request" = issued from the store for this building; "complaint" = logged on a complaint job. */
	source: "request" | "complaint";
	by: string;
	technician: string | null;
	complaint: { id: number; apartmentNumber: string; customerName: string } | null;
	notes: string | null;
}

const INVENTORY_SELECT = { id: true, itemName: true, itemCode: true, category: true, unit: true, unitPrice: true } as const;

/** Stock always sorts after real buildings. */
function compareBuildings(a: string, b: string): number {
	if (a === STOCK_LABEL || b === STOCK_LABEL) return a === b ? 0 : a === STOCK_LABEL ? 1 : -1;
	return a.localeCompare(b);
}

/**
 * Every inventory movement tied to a building: approved store requests (how the
 * storekeeper actually issues materials) plus items logged on complaint jobs.
 * Callers must check access.
 */
async function loadUsageEntries(filters: UsageReportFilters): Promise<UsageEntry[]> {
	const from = filters.from && YMD.test(filters.from) ? new Date(`${filters.from}T00:00:00`) : null;
	const to = filters.to && YMD.test(filters.to) ? new Date(`${filters.to}T23:59:59.999`) : null;
	const inRange = (d: Date) => (!from || d >= from) && (!to || d <= to);

	const [usages, requests, buildings] = await Promise.all([
		prismaClient.complaintInventoryUsage.findMany({
			select: {
				quantityUsed: true,
				notes: true,
				createdAt: true,
				employee: { select: { fullName: true } },
				complaint: { select: { id: true, buildingName: true, apartmentNumber: true, customerName: true } },
				inventory: { select: INVENTORY_SELECT },
			},
		}),
		prismaClient.inventoryRequest.findMany({
			where: { status: "APPROVED" },
			select: {
				quantity: true,
				reason: true,
				notes: true,
				buildingName: true,
				location: true,
				technicianName: true,
				createdAt: true,
				approvedAt: true,
				employee: { select: { fullName: true } },
				inventory: { select: INVENTORY_SELECT },
			},
		}),
		prismaClient.buildings.findMany({ select: { buildingName: true } }),
	]);

	const resolver = makeBuildingResolver(buildings.map((b) => b.buildingName));
	const entries: UsageEntry[] = [];

	for (const u of usages) {
		entries.push({
			date: u.createdAt,
			building: u.complaint.buildingName,
			location: u.complaint.apartmentNumber,
			quantity: u.quantityUsed,
			inventory: u.inventory,
			source: "complaint",
			by: u.employee.fullName,
			technician: null,
			complaint: { id: u.complaint.id, apartmentNumber: u.complaint.apartmentNumber, customerName: u.complaint.customerName },
			notes: u.notes,
		});
	}

	for (const r of requests) {
		// Requests made after the Building field existed always set it ("" = stock);
		// older ones (null) only have the storekeeper's free text in `reason`.
		const hasExplicitBuilding = r.buildingName !== null;
		const resolved = hasExplicitBuilding ? { building: r.buildingName || null, location: r.location } : resolver.fromReason(r.reason);
		entries.push({
			date: r.approvedAt ?? r.createdAt,
			building: resolved.building ?? STOCK_LABEL,
			location: resolved.location,
			quantity: r.quantity,
			inventory: r.inventory,
			source: "request",
			by: r.employee.fullName,
			technician: r.technicianName ?? (hasExplicitBuilding ? null : r.notes?.trim() || null),
			complaint: null,
			notes: hasExplicitBuilding ? r.notes : null,
		});
	}

	return entries
		.filter((e) => inRange(e.date) && (!filters.building || e.building === filters.building))
		.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Aggregate building usage into per-building, per-item rows. */
export async function getUsageByBuilding(filters: UsageReportFilters): Promise<UsageXlsxRow[]> {
	if (!(await requireInventoryAccess())) return [];
	const entries = await loadUsageEntries(filters);

	const grouped = new Map<string, UsageXlsxRow>();
	for (const e of entries) {
		const key = `${e.building}|${e.inventory.id}`;
		let row = grouped.get(key);
		if (!row) {
			row = {
				buildingName: e.building,
				itemName: e.inventory.itemName,
				itemCode: e.inventory.itemCode,
				category: e.inventory.category,
				unit: e.inventory.unit,
				totalQuantity: 0,
				timesUsed: 0,
				estimatedCost: e.inventory.unitPrice !== null ? 0 : null,
			};
			grouped.set(key, row);
		}
		row.totalQuantity += e.quantity;
		row.timesUsed += 1;
		if (row.estimatedCost !== null && e.inventory.unitPrice !== null) {
			row.estimatedCost += e.quantity * e.inventory.unitPrice;
		}
	}

	return [...grouped.values()].sort((a, b) => compareBuildings(a.buildingName, b.buildingName) || a.itemName.localeCompare(b.itemName));
}

/** Distinct buildings that have any recorded usage (stock last). */
export async function getUsageBuildingNames(): Promise<string[]> {
	if (!(await requireInventoryAccess())) return [];
	const entries = await loadUsageEntries({});
	return [...new Set(entries.map((e) => e.building))].sort(compareBuildings);
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
	// Keep the dashes, middle dot and bullet used in this report — WinAnsi has them
	return s.replace(/[^\x20-\x7E–—·•]/g, "?");
}

/**
 * Detailed PDF: per building, an item summary table plus the full usage log —
 * every individual entry with date, quantity, employee, complaint and notes.
 */
export async function exportUsageByBuildingPdf(filters: UsageReportFilters): Promise<PdfResult> {
	const actor = await requireInventoryAccess();
	if (!actor) return { success: false, message: "Not authorized to export reports." };

	const usages = await loadUsageEntries(filters);

	// Group detail entries per building, and build the per-item summaries
	const byBuilding = new Map<string, UsageEntry[]>();
	for (const u of usages) {
		if (!byBuilding.has(u.building)) byBuilding.set(u.building, []);
		byBuilding.get(u.building)!.push(u);
	}
	const buildings = [...byBuilding.keys()].sort(compareBuildings);

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
			s.qty += u.quantity;
			s.times += 1;
			if (s.cost !== null && u.inventory.unitPrice !== null) s.cost += u.quantity * u.inventory.unitPrice;
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
			const date = todayYmdDubai(u.date);
			const where = u.complaint
				? `complaint #${u.complaint.id} (apt ${u.complaint.apartmentNumber}, ${u.complaint.customerName})`
				: [u.location ? `flat/room ${u.location}` : null, u.technician ? `for ${u.technician}` : null, "issued from store"].filter(Boolean).join(", ");
			const lineText = `${date}  —  ${u.inventory.itemName}: ${formatQty(u.quantity, u.inventory.unit)}  ·  by ${u.by}  ·  ${where}`;
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
