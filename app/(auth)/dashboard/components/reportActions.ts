// app/complaints/actions.ts
"use server";

import prisma from "@/lib/prisma";

export type ComplaintColumn = "customerName" | "customerEmail" | "customerPhone" | "customerAddress" | "buildingName" | "apartmentNumber" | "area";

const ALLOWED = new Set<ComplaintColumn>(["customerName", "customerEmail", "customerPhone", "customerAddress", "buildingName", "apartmentNumber", "area"]);

export type UniqueOption = { value: string; label: string };

export async function getUniqueOptions(column: ComplaintColumn): Promise<UniqueOption[]> {
	if (!ALLOWED.has(column)) throw new Error("Invalid column");

	const rows = await prisma.complaint.findMany({
		distinct: [column as any],
		select: { [column]: true } as any,
		orderBy: { [column]: "asc" } as any,
	});

	const options = rows
		.map((r: any) => r[column])
		.filter((v: any) => v !== null && v !== undefined && String(v).trim() !== "")
		.map((v: any) => String(v))
		.filter((v, i, arr) => arr.indexOf(v) === i)
		.map((v) => ({ value: v, label: v }));

	return options;
}

export type PreviewCriterion = ComplaintColumn | "createdAt";

export type ComplaintPreviewRow = {
	id: string;
	customerName: string;
	customerEmail: string | null;
	customerPhone: string;
	customerAddress: string;
	buildingName: string;
	apartmentNumber: string | null;
	area: string;
	createdAt: string; // ISO string for client
};

/**
 * Fetch preview rows from DB.
 * - If criterion is a normal column => exact match on `value`
 * - If criterion is createdAt       => inclusive date range [startDate, endDate]
 */
export async function previewComplaints(params: {
	criterion: PreviewCriterion;
	value?: string;
	startDate?: string; // YYYY-MM-DD
	endDate?: string; // YYYY-MM-DD
	limit?: number; // default 50
}): Promise<ComplaintPreviewRow[]> {
	const { criterion, value, startDate, endDate } = params;
	const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 500);

	let where: any = {};

	if (criterion === "createdAt") {
		if (!startDate || !endDate) throw new Error("startDate and endDate are required for createdAt");
		// Build an inclusive range: [start, end + 1 day)
		const start = new Date(`${startDate}T00:00:00.000Z`);
		const endExclusive = new Date(`${endDate}T00:00:00.000Z`);
		endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

		where = {
			createdAt: {
				gte: start,
				lt: endExclusive,
			},
		};
	} else {
		if (!ALLOWED.has(criterion as ComplaintColumn)) throw new Error("Invalid column");
		if (!value || !String(value).trim()) throw new Error("Value is required for this criterion");
		where = {
			[criterion]: value,
		};
	}

	const rows = await prisma.complaint.findMany({
		where,
		orderBy: { createdAt: "desc" },
		take: limit,
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			customerPhone: true,
			customerAddress: true,
			buildingName: true,
			apartmentNumber: true,
			area: true,
			createdAt: true,
		},
	});

	return rows.map((r) => ({
		id: String(r.id),
		customerName: r.customerName,
		customerEmail: r.customerEmail,
		customerPhone: r.customerPhone,
		customerAddress: r.customerAddress,
		buildingName: r.buildingName,
		apartmentNumber: r.apartmentNumber,
		area: r.area,
		createdAt: r.createdAt.toISOString(),
	}));
}
