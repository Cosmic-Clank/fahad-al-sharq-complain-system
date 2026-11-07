"use server";

import prismaClient from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { dubaiDayEnd, dubaiDayStart } from "@/lib/dubai-time";
import { signedBillUrls } from "@/lib/inventory-bills";
import { round2 } from "@/lib/hr-payroll";
import { buildRestockCostWorkbook, workbookToBase64, XLSX_MIME, type RestockCostXlsxRow } from "@/lib/xlsx-reports";
import type { PdfResult } from "@/app/(auth)/dashboard/admin/hr/hrReportActions";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

/** ADD transactions that are not restocks: the item's opening stock and manual edits of the quantity. */
const NOT_RESTOCK_NOTES = ["Initial inventory addition", "Manual adjustment via edit"];

export interface RestockCostFilters {
	from?: string; // "YYYY-MM-DD"
	to?: string;
}

export interface RestockCostRow extends RestockCostXlsxRow {
	id: number;
	inventoryId: number;
	/** "YYYY-MM", Dubai */
	month: string;
	/** Short-lived link to the bill (private bucket), when there is one */
	billUrl: string | null;
}

export interface RestockCostReport {
	rows: RestockCostRow[];
	totalCost: number;
	withoutCost: number;
	/** newest month first */
	months: { month: string; restocks: number; cost: number }[];
}

function requireInventoryAccess() {
	return requireRole(["ADMIN", "INVENTORY_MANAGER"]);
}

function dubaiStamp(d: Date): string {
	return new Date(d.getTime() + DUBAI_OFFSET_MS).toISOString().replace("T", " ").slice(0, 16);
}

async function loadRestocks(filters: RestockCostFilters, withBillLinks: boolean): Promise<RestockCostRow[]> {
	const from = filters.from && YMD.test(filters.from) ? dubaiDayStart(filters.from) : undefined;
	const to = filters.to && YMD.test(filters.to) ? dubaiDayEnd(filters.to) : undefined;

	const txs = await prismaClient.inventoryTransaction.findMany({
		where: {
			transactionType: "ADD",
			OR: [{ notes: null }, { notes: { notIn: NOT_RESTOCK_NOTES } }],
			...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: 5000,
		select: {
			id: true,
			inventoryId: true,
			quantity: true,
			notes: true,
			cost: true,
			billPath: true,
			recordedByName: true,
			createdAt: true,
			inventory: { select: { itemName: true, itemCode: true, unit: true } },
		},
	});

	const links = withBillLinks ? await signedBillUrls(txs.map((t) => t.billPath ?? "")) : new Map<string, string>();

	return txs.map((t) => {
		const date = dubaiStamp(t.createdAt);
		return {
			id: t.id,
			inventoryId: t.inventoryId,
			date,
			month: date.slice(0, 7),
			itemName: t.inventory.itemName,
			itemCode: t.inventory.itemCode,
			quantity: t.quantity,
			unit: t.inventory.unit,
			cost: t.cost,
			recordedBy: t.recordedByName,
			notes: t.notes === "Restocked via restock form" ? null : t.notes,
			hasBill: !!t.billPath,
			billUrl: t.billPath ? (links.get(t.billPath) ?? null) : null,
		};
	});
}

/** Every restock in the range with its cost and bill, plus totals per month. */
export async function getRestockCostReport(filters: RestockCostFilters): Promise<RestockCostReport> {
	if (!(await requireInventoryAccess())) return { rows: [], totalCost: 0, withoutCost: 0, months: [] };
	const rows = await loadRestocks(filters, true);

	const byMonth = new Map<string, { restocks: number; cost: number }>();
	for (const r of rows) {
		const m = byMonth.get(r.month) ?? { restocks: 0, cost: 0 };
		m.restocks += 1;
		m.cost += r.cost ?? 0;
		byMonth.set(r.month, m);
	}

	return {
		rows,
		totalCost: round2(rows.reduce((s, r) => s + (r.cost ?? 0), 0)),
		withoutCost: rows.filter((r) => r.cost === null).length,
		months: [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, v]) => ({ month, restocks: v.restocks, cost: round2(v.cost) })),
	};
}

export async function exportRestockCostsXlsx(filters: RestockCostFilters): Promise<PdfResult> {
	if (!(await requireInventoryAccess())) return { success: false, message: "Not authorized to export reports." };
	const rows = await loadRestocks(filters, false);
	const label = filters.from || filters.to ? `${filters.from || "…"} to ${filters.to || "…"}` : "All time";
	const wb = buildRestockCostWorkbook(rows, label);
	const suffix = filters.from || filters.to ? `-${filters.from || "start"}-to-${filters.to || "now"}` : "";
	return { success: true, fileName: `restock-costs${suffix}.xlsx`, base64: await workbookToBase64(wb), mime: XLSX_MIME };
}
