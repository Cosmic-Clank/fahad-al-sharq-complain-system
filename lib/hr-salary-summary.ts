// Monthly salary summary across all staff. Uses computePayslip so every row
// matches the employee's own Payslips tab exactly.
import prismaClient from "./prisma";
import { HR_STAFF_ROLES } from "./hr-roles";
import { computePayslip, round2, type PayslipBonus, type PayslipPenalty } from "./hr-payroll";

export interface SalarySummaryRow {
	userId: number;
	fullName: string;
	username: string;
	hasProfile: boolean;
	basic: number;
	allowances: number;
	bonuses: number;
	gross: number;
	deductions: number;
	net: number;
	present: number;
	late: number;
	absent: number;
}

export type SalarySummaryTotals = Omit<SalarySummaryRow, "userId" | "fullName" | "username" | "hasProfile">;

export interface SalarySummary {
	month: string;
	rows: SalarySummaryRow[];
	totals: SalarySummaryTotals;
}

export interface SalarySummaryInput {
	users: { id: number; fullName: string; username: string; profile: { basicSalary: number; allowances: number } | null }[];
	bonuses: (PayslipBonus & { userId: number })[];
	penalties: (PayslipPenalty & { userId: number })[];
	attendance: { userId: number; status: string }[];
}

/** Pure: builds the summary from already-fetched data (node-testable). */
export function buildSalarySummary(month: string, input: SalarySummaryInput): SalarySummary {
	const group = <T extends { userId: number }>(items: T[]) => {
		const map = new Map<number, T[]>();
		for (const item of items) map.set(item.userId, [...(map.get(item.userId) ?? []), item]);
		return map;
	};
	const bonusesByUser = group(input.bonuses);
	const penaltiesByUser = group(input.penalties);
	const attendanceByUser = group(input.attendance);

	const rows: SalarySummaryRow[] = input.users.map((u) => {
		const payslip = computePayslip({
			basicSalary: u.profile?.basicSalary ?? 0,
			allowances: u.profile?.allowances ?? 0,
			bonuses: bonusesByUser.get(u.id) ?? [],
			penalties: penaltiesByUser.get(u.id) ?? [],
		});
		const days = attendanceByUser.get(u.id) ?? [];
		return {
			userId: u.id,
			fullName: u.fullName,
			username: u.username,
			hasProfile: !!u.profile,
			basic: payslip.basic,
			allowances: payslip.allowances,
			bonuses: payslip.totalBonuses,
			gross: payslip.gross,
			deductions: payslip.totalDeductions,
			net: payslip.net,
			present: days.filter((d) => d.status === "PRESENT").length,
			late: days.filter((d) => d.status === "LATE").length,
			absent: days.filter((d) => d.status === "ABSENT").length,
		};
	});

	const sum = (key: keyof SalarySummaryTotals) => rows.reduce((s, r) => s + r[key], 0);
	const totals: SalarySummaryTotals = {
		basic: round2(sum("basic")),
		allowances: round2(sum("allowances")),
		bonuses: round2(sum("bonuses")),
		gross: round2(sum("gross")),
		deductions: round2(sum("deductions")),
		net: round2(sum("net")),
		present: sum("present"),
		late: sum("late"),
		absent: sum("absent"),
	};

	return { month, rows, totals };
}

/** Fetches and builds the summary for a "YYYY-MM" month. Callers must check HR access. */
export async function getSalarySummary(month: string): Promise<SalarySummary> {
	const [users, bonuses, penalties, attendance] = await Promise.all([
		prismaClient.user.findMany({
			where: { role: { in: HR_STAFF_ROLES } },
			select: { id: true, fullName: true, username: true, employeeProfile: { select: { basicSalary: true, allowances: true } } },
			orderBy: { fullName: "asc" },
		}),
		prismaClient.bonus.findMany({ where: { month }, select: { userId: true, amount: true, note: true } }),
		prismaClient.penalty.findMany({ where: { effectiveMonth: month }, select: { userId: true, type: true, amount: true, details: true, isAutomatic: true } }),
		prismaClient.attendanceRecord.findMany({ where: { date: { startsWith: month } }, select: { userId: true, status: true } }),
	]);

	return buildSalarySummary(month, {
		users: users.map((u) => ({ id: u.id, fullName: u.fullName, username: u.username, profile: u.employeeProfile })),
		bonuses,
		penalties,
		attendance,
	});
}
