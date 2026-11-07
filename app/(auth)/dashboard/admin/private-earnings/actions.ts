"use server";

import prismaClient from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { round2 } from "@/lib/hr-payroll";
import { monthLabel } from "@/lib/hr-dates";
import { buildEarningsWorkbook, workbookToBase64, XLSX_MIME, type EarningsXlsxRow } from "@/lib/xlsx-reports";
import type { PdfResult } from "@/app/(auth)/dashboard/admin/hr/hrReportActions";

const MONTH = /^\d{4}-\d{2}$/;
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

const dubaiYmd = (d: Date) => new Date(d.getTime() + DUBAI_OFFSET_MS).toISOString().slice(0, 10);

export interface EarningsRow extends EarningsXlsxRow {
	/** "YYYY-MM" of jobDate */
	month: string;
}

export interface EarningsReport {
	/** newest first */
	months: { month: string; jobs: number; charged: number; total: number }[];
	month: string;
	rows: EarningsRow[];
	total: number;
	/** completed jobs in this month that have no amount yet */
	missing: number;
	allTimeTotal: number;
}

/**
 * Every private complaint as a job. A job belongs to the month it was completed
 * (end of its latest work session, Dubai time); jobs not completed yet count in
 * the month they were filed.
 */
async function loadPrivateJobs(): Promise<EarningsRow[]> {
	const complaints = await prismaClient.complaint.findMany({
		where: { isPrivate: true },
		select: {
			id: true,
			customerName: true,
			buildingName: true,
			apartmentNumber: true,
			createdAt: true,
			chargedAmount: true,
			// latest session decides the status (same rule as the complaint lists)
			workTimes: { select: { endTime: true }, orderBy: [{ date: "desc" }, { id: "desc" }], take: 1 },
		},
	});

	return complaints
		.map((c) => {
			const latest = c.workTimes[0];
			const status = !latest ? "Incomplete" : latest.endTime ? "Completed" : "In Progress";
			const jobDate = dubaiYmd(latest?.endTime ?? c.createdAt);
			return {
				complaintId: c.id,
				jobDate,
				month: jobDate.slice(0, 7),
				status,
				customerName: c.customerName,
				buildingName: c.buildingName,
				apartmentNumber: c.apartmentNumber,
				charged: c.chargedAmount,
			};
		})
		.sort((a, b) => b.jobDate.localeCompare(a.jobDate) || b.complaintId - a.complaintId);
}

export async function getPrivateEarnings(month: string): Promise<EarningsReport | null> {
	if (!(await requireRole(["ADMIN"]))) return null;
	const jobs = await loadPrivateJobs();

	const byMonth = new Map<string, { jobs: number; charged: number; total: number }>();
	for (const j of jobs) {
		const m = byMonth.get(j.month) ?? { jobs: 0, charged: 0, total: 0 };
		m.jobs += 1;
		if (j.charged !== null) {
			m.charged += 1;
			m.total += j.charged;
		}
		byMonth.set(j.month, m);
	}

	const rows = MONTH.test(month) ? jobs.filter((j) => j.month === month) : [];
	return {
		months: [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([m, v]) => ({ month: m, ...v, total: round2(v.total) })),
		month,
		rows,
		total: round2(rows.reduce((s, r) => s + (r.charged ?? 0), 0)),
		missing: rows.filter((r) => r.status === "Completed" && r.charged === null).length,
		allTimeTotal: round2(jobs.reduce((s, j) => s + (j.charged ?? 0), 0)),
	};
}

/** Excel of one month's private jobs, or of all jobs when month is "all". */
export async function exportPrivateEarningsXlsx(month: string): Promise<PdfResult> {
	if (!(await requireRole(["ADMIN"]))) return { success: false, message: "Not authorized to export reports." };
	const all = month === "all";
	if (!all && !MONTH.test(month)) return { success: false, message: "Invalid month." };
	const jobs = await loadPrivateJobs();
	const rows = all ? jobs : jobs.filter((j) => j.month === month);
	const wb = buildEarningsWorkbook(rows, all ? "All private jobs" : monthLabel(month));
	return { success: true, fileName: `private-earnings-${all ? "all" : month}.xlsx`, base64: await workbookToBase64(wb), mime: XLSX_MIME };
}
