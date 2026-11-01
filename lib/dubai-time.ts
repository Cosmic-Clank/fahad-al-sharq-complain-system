// Display helpers for dates rendered on the server. The server runs in UTC,
// so Date#toLocaleString()/toDateString() there show times 4 hours behind
// Dubai (and the wrong day between 00:00 and 04:00). Dubai is UTC+4 all year.

const TZ = "Asia/Dubai";
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Like toLocaleString() in en-US, but in Dubai time: "10/19/2026, 5:03:00 PM". */
export function formatDubaiDateTime(d: Date): string {
	return d.toLocaleString("en-US", { timeZone: TZ });
}

/** Like toLocaleDateString() in en-US, but in Dubai time: "10/19/2026". */
export function formatDubaiDate(d: Date): string {
	return d.toLocaleDateString("en-US", { timeZone: TZ });
}

/** "October 19, 2026" (with time: "October 19, 2026 at 5:03 PM"), in Dubai time. */
export function formatDubaiLong(d: Date, withTime = false): string {
	return d.toLocaleString("en-US", { timeZone: TZ, dateStyle: "long", ...(withTime ? { timeStyle: "short" as const } : {}) });
}

/** Like toLocaleTimeString() in en-US, but in Dubai time: "5:03:00 PM". */
export function formatDubaiTime(d: Date): string {
	return d.toLocaleTimeString("en-US", { timeZone: TZ });
}

/** Same shape as Date#toDateString() ("Mon Oct 19 2026"), but for the Dubai calendar day. */
export function dubaiDateString(d: Date): string {
	const x = new Date(d.getTime() + DUBAI_OFFSET_MS);
	return `${WEEKDAYS[x.getUTCDay()]} ${MONTHS[x.getUTCMonth()]} ${String(x.getUTCDate()).padStart(2, "0")} ${x.getUTCFullYear()}`;
}

/** Start/end instants of Dubai calendar days, for "YYYY-MM-DD" range filters. */
export function dubaiDayStart(ymd: string): Date {
	return new Date(`${ymd}T00:00:00+04:00`);
}
export function dubaiDayEnd(ymd: string): Date {
	return new Date(`${ymd}T23:59:59.999+04:00`);
}
