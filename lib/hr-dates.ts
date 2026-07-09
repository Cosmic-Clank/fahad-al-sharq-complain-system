// Date helpers for the HR system. Attendance dates and payroll months are
// stored as Dubai-local strings ("YYYY-MM-DD" / "YYYY-MM") so a UTC server
// never shifts them across midnight.

const DUBAI_TZ = "Asia/Dubai";

function dubaiParts(date: Date): { year: string; month: string; day: string } {
	const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: DUBAI_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
	const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
	return { year: parts.year, month: parts.month, day: parts.day };
}

export function todayYmdDubai(now: Date = new Date()): string {
	const { year, month, day } = dubaiParts(now);
	return `${year}-${month}-${day}`;
}

export function currentMonthDubai(now: Date = new Date()): string {
	const { year, month } = dubaiParts(now);
	return `${year}-${month}`;
}

/** All dates of a "YYYY-MM" month as "YYYY-MM-DD" strings. */
export function daysInMonth(month: string): string[] {
	const [y, m] = month.split("-").map(Number);
	const count = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this month
	return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

/** Compare two "HH:mm" strings. Negative if a < b, 0 if equal, positive if a > b. */
export function compareHHmm(a: string, b: string): number {
	const [ah, am] = a.split(":").map(Number);
	const [bh, bm] = b.split(":").map(Number);
	return ah * 60 + am - (bh * 60 + bm);
}

/** Previous / next "YYYY-MM". */
export function shiftMonth(month: string, delta: number): string {
	const [y, m] = month.split("-").map(Number);
	const d = new Date(y, m - 1 + delta, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Whole months from today until an expiry date (negative if already expired). */
export function monthsUntil(expiryYmd: string, todayYmd: string = todayYmdDubai()): number {
	const [ey, em, ed] = expiryYmd.split("-").map(Number);
	const [ty, tm, td] = todayYmd.split("-").map(Number);
	let months = (ey - ty) * 12 + (em - tm);
	if (ed < td) months -= 1;
	return months;
}

export type ExpiryLevel = "expired" | "critical" | "warning" | "ok";

/** ≤0 days = expired, ≤3 months = critical, ≤6 months = warning. */
export function expiryLevel(expiryYmd: string, todayYmd: string = todayYmdDubai()): ExpiryLevel {
	if (expiryYmd <= todayYmd) return "expired";
	const months = monthsUntil(expiryYmd, todayYmd);
	if (months < 3) return "critical";
	if (months < 6) return "warning";
	return "ok";
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-07" -> "July 2026" */
export function monthLabel(month: string): string {
	const [y, m] = month.split("-").map(Number);
	return `${MONTH_NAMES[m - 1] ?? month} ${y}`;
}
