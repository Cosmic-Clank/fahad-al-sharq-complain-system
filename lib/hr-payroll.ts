// Payroll math for the HR system. All money values are AED floats — always
// pass results through round2() before storing or displaying.

export function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

/** Completed years of service since joining (0 if no joining date or in the future). */
export function yearsOfServiceCompleted(joiningDate: Date | null | undefined, now: Date = new Date()): number {
	if (!joiningDate) return 0;
	let years = now.getFullYear() - joiningDate.getFullYear();
	const anniversaryThisYear = new Date(joiningDate);
	anniversaryThisYear.setFullYear(now.getFullYear());
	if (now < anniversaryThisYear) years -= 1;
	return Math.max(0, years);
}

export interface LeaveSalaryInput {
	basicSalary: number;
	joiningDate: Date | null;
	leaveSalaryOverride: number | null;
}

export interface LeaveSalaryResult {
	accrued: number; // override ?? basic × completed years
	deducted: number; // sum of LEAVE_SALARY_DEDUCTION penalty amounts
	balance: number;
	completedYears: number;
	isOverridden: boolean;
}

/** Leave salary: 1 month basic per completed year of service, admin-overridable, minus leave-salary penalties. */
export function computeLeaveSalary(profile: LeaveSalaryInput, leaveDeductionAmounts: number[], now: Date = new Date()): LeaveSalaryResult {
	const completedYears = yearsOfServiceCompleted(profile.joiningDate, now);
	const isOverridden = profile.leaveSalaryOverride !== null && profile.leaveSalaryOverride !== undefined;
	const accrued = round2(isOverridden ? profile.leaveSalaryOverride! : profile.basicSalary * completedYears);
	const deducted = round2(leaveDeductionAmounts.reduce((s, a) => s + a, 0));
	return { accrued, deducted, balance: round2(accrued - deducted), completedYears, isOverridden };
}

/** Automatic deduction for the 3rd "Other" early leave in a month: 2 days of basic pay. */
export function otherLateDeductionAmount(basicSalary: number): number {
	return round2((basicSalary / 30) * 2);
}

export interface PayslipLine {
	label: string;
	amount: number;
	kind: "earning" | "deduction";
}

export interface PayslipResult {
	basic: number;
	allowances: number;
	totalBonuses: number;
	gross: number;
	totalDeductions: number;
	net: number;
	lines: PayslipLine[];
}

export interface PayslipBonus {
	amount: number;
	note: string | null;
}

export interface PayslipPenalty {
	type: string;
	amount: number | null;
	details: string | null;
	isAutomatic: boolean;
}

/**
 * Monthly payslip: basic + allowances + bonuses − SALARY_DEDUCTION penalties.
 * LEAVE_SALARY_DEDUCTION affects the leave balance (not the payslip);
 * TICKET_REMOVAL is informational only.
 */
export function computePayslip(input: { basicSalary: number; allowances: number; bonuses: PayslipBonus[]; penalties: PayslipPenalty[] }): PayslipResult {
	const basic = round2(input.basicSalary);
	const allowances = round2(input.allowances);

	const lines: PayslipLine[] = [
		{ label: "Basic salary", amount: basic, kind: "earning" },
		{ label: "Allowances", amount: allowances, kind: "earning" },
	];

	let totalBonuses = 0;
	for (const b of input.bonuses) {
		totalBonuses += b.amount;
		lines.push({ label: b.note ? `Bonus — ${b.note}` : "Bonus", amount: round2(b.amount), kind: "earning" });
	}
	totalBonuses = round2(totalBonuses);

	let totalDeductions = 0;
	for (const p of input.penalties) {
		if (p.type !== "SALARY_DEDUCTION" || p.amount === null) continue;
		totalDeductions += p.amount;
		const label = p.isAutomatic ? "Deduction (automatic) — 3× 'Other' early leave" : p.details ? `Deduction — ${p.details}` : "Salary deduction";
		lines.push({ label, amount: round2(p.amount), kind: "deduction" });
	}
	totalDeductions = round2(totalDeductions);

	const gross = round2(basic + allowances + totalBonuses);
	return { basic, allowances, totalBonuses, gross, totalDeductions, net: round2(gross - totalDeductions), lines };
}
