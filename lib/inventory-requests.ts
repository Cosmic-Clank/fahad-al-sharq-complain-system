// Display helpers for inventory requests (shared by approvers' and employees' views).
import { STOCK_LABEL } from "./inventory-request-building";

const REJECTION_PREFIX = "REJECTION: ";

/**
 * A rejection reason is stored in `notes` as a "REJECTION: …" line (older rows:
 * the whole notes field). Splits it back into the employee's own notes and the reason.
 */
export function splitRejection(notes: string | null | undefined): { notes: string | null; rejection: string | null } {
	if (!notes) return { notes: null, rejection: null };
	const lines = notes.split("\n");
	const at = lines.findIndex((l) => l.startsWith(REJECTION_PREFIX));
	if (at === -1) return { notes, rejection: null };
	const own = lines.slice(0, at).join("\n").trim();
	return { notes: own || null, rejection: lines.slice(at).join("\n").slice(REJECTION_PREFIX.length).trim() || null };
}

/** "AL BASHA-1 · 210" / "Stock (no building)"; null for legacy requests without a Building field. */
export function requestBuildingLabel(request: { buildingName?: string | null; location?: string | null }): string | null {
	if (request.buildingName === null || request.buildingName === undefined) return null;
	return `${request.buildingName || STOCK_LABEL}${request.location ? ` · ${request.location}` : ""}`;
}
