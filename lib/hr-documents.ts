import type { ExpiryLevel } from "./hr-dates";

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
	PASSPORT: "Passport",
	VISA: "Visa",
	EMIRATES_ID: "Emirates ID",
	JOB_CONTRACT: "Job Contract",
	LABOUR_CARD: "Labour Card",
	OTHER: "Other",
};

export const EXPIRY_LEVEL_LABELS: Record<ExpiryLevel, string> = {
	expired: "Expired",
	critical: "Critical (<3 months)",
	warning: "Expiring (<6 months)",
	ok: "Valid",
};

/** Tailwind badge classes per expiry level. */
export const EXPIRY_LEVEL_STYLES: Record<ExpiryLevel, string> = {
	expired: "bg-red-600 text-white",
	critical: "bg-red-100 text-red-800",
	warning: "bg-amber-100 text-amber-800",
	ok: "bg-green-100 text-green-800",
};
