// Rules for restock bills, shared by the restock form (client) and the server action.
// Bills live in the PRIVATE "inventory-bills" bucket and are only shown through
// short-lived signed links (see lib/inventory-bills.ts).

export const BILL_BUCKET = "inventory-bills";

/** Server actions accept 5MB bodies in total, so the file itself must stay a bit under that. */
export const MAX_BILL_BYTES = 4.5 * 1024 * 1024;

/** Allowed bill types → stored file extension. */
export const BILL_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"application/pdf": "pdf",
};

/** Largest purchase amount accepted for one restock (guards against typos like an extra 000s). */
export const MAX_RESTOCK_COST = 10_000_000;

/** Validation messages (keep in sync with lib/messages-ar.ts). */
export const BILL_MESSAGES = {
	billRequired: "Please attach the bill for this restock.",
	invalidBill: "Invalid bill. Use a photo (JPEG/PNG) or a PDF, max 4.5MB.",
	costRequired: "Please enter the total cost of this restock.",
	costInvalid: "The cost must be more than 0 AED.",
	costTooHigh: "That cost looks too high. Please check the amount.",
	billUploadFailed: "Failed to upload the bill. Please try again.",
};
