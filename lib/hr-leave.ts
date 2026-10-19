// Leave request rules. Pure helpers — node-testable, shared by client and server.
import { yearsOfServiceCompleted } from "./hr-payroll";

export const LEAVE_SIGNATURE_MIN_YEARS = 2;
export const MAX_LEAVE_DAYS = 90;
/** Sick leave can be requested after the fact, up to this many days back. */
export const SICK_BACKDATE_DAYS = 30;

export type LeaveTypeValue = "ANNUAL" | "SICK" | "EMERGENCY" | "UNPAID";

export const LEAVE_TYPE_LABELS: Record<string, string> = {
	ANNUAL: "Annual Leave",
	SICK: "Sick Leave",
	EMERGENCY: "Emergency Leave",
	UNPAID: "Unpaid Leave",
};

export const LEAVE_STATUS_LABELS: Record<string, string> = {
	PENDING: "Waiting for approval",
	APPROVED: "Approved",
	REJECTED: "Rejected",
	CANCELLED: "Cancelled",
};

export const LEAVE_STATUS_STYLES: Record<string, string> = {
	PENDING: "bg-blue-100 text-blue-800",
	APPROVED: "bg-green-100 text-green-800",
	REJECTED: "bg-red-100 text-red-800",
	CANCELLED: "bg-gray-100 text-gray-600",
};

/**
 * Signature is required from 2 completed years of service. If the joining date
 * is unknown we can't tell, so we require it (safer — and nudges HR to fill it in).
 */
export function leaveSignatureRequired(joiningDate: Date | null | undefined, now: Date = new Date()): boolean {
	if (!joiningDate) return true;
	return yearsOfServiceCompleted(joiningDate, now) >= LEAVE_SIGNATURE_MIN_YEARS;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const toUtc = (ymd: string) => Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)));

/** Inclusive calendar-day count between two "YYYY-MM-DD" dates (0 if invalid or reversed). */
export function countLeaveDays(start: string, end: string): number {
	if (!YMD.test(start) || !YMD.test(end)) return 0;
	const diff = (toUtc(end) - toUtc(start)) / 86_400_000;
	return diff < 0 ? 0 : diff + 1;
}

/** Every "YYYY-MM-DD" from start to end inclusive. */
export function leaveDates(start: string, end: string): string[] {
	const n = countLeaveDays(start, end);
	const first = toUtc(start);
	return Array.from({ length: n }, (_, i) => new Date(first + i * 86_400_000).toISOString().slice(0, 10));
}

export function shiftYmd(ymd: string, days: number): string {
	return new Date(toUtc(ymd) + days * 86_400_000).toISOString().slice(0, 10);
}

/** True when two inclusive ranges share at least one day. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
	return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Validates a requested range. Returns an English message (translated by the
 * UI via messages-ar) or null when OK. `today` is the Dubai-local date.
 */
export function validateLeaveRange(type: string, start: string, end: string, today: string): string | null {
	if (!YMD.test(start) || !YMD.test(end)) return "Please choose both a start and an end date.";
	if (end < start) return "The end date must be on or after the start date.";
	const days = countLeaveDays(start, end);
	if (days > MAX_LEAVE_DAYS) return `A single leave request can be at most ${MAX_LEAVE_DAYS} days.`;
	const earliest = type === "SICK" ? shiftYmd(today, -SICK_BACKDATE_DAYS) : today;
	if (start < earliest) {
		return type === "SICK" ? `Sick leave can only start up to ${SICK_BACKDATE_DAYS} days in the past.` : "Leave cannot start in the past. For past sick days choose Sick Leave.";
	}
	return null;
}

/** Friendly "Mon 3 Nov 2026" for a "YYYY-MM-DD" string. */
export function formatLeaveDate(ymd: string): string {
	if (!YMD.test(ymd)) return ymd;
	return new Date(toUtc(ymd)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
