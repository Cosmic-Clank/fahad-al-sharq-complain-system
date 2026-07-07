// Shared helpers for inventory quantity units.
// Quantities are stored as floats; PIECES items must stay whole numbers.

export type InventoryUnit = "PIECES" | "METERS";

export const UNIT_OPTIONS: { value: InventoryUnit; label: string }[] = [
	{ value: "PIECES", label: "Pieces" },
	{ value: "METERS", label: "Meters" },
];

const UNIT_LABELS: Record<InventoryUnit, string> = {
	PIECES: "pcs",
	METERS: "m",
};

export function unitLabel(unit?: string | null): string {
	return UNIT_LABELS[(unit as InventoryUnit) ?? "PIECES"] ?? "pcs";
}

export function formatQty(quantity: number, unit?: string | null): string {
	// Trim float noise (11.999999 -> 12, 2.50 -> 2.5)
	const value = Number(quantity.toFixed(2));
	return `${value} ${unitLabel(unit)}`;
}

export function allowsDecimals(unit?: string | null): boolean {
	return unit === "METERS";
}

export function isValidQtyForUnit(quantity: number, unit?: string | null): boolean {
	return allowsDecimals(unit) || Number.isInteger(quantity);
}

export function qtyStep(unit?: string | null): string {
	return allowsDecimals(unit) ? "0.01" : "1";
}
