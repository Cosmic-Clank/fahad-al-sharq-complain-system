"use server";

import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { buildUsageWorkbook, workbookToBase64, XLSX_MIME, type UsageXlsxRow } from "@/lib/xlsx-reports";
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
