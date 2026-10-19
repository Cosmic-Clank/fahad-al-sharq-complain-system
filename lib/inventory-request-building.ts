// Resolves which building an inventory request was for.
//
// New requests store `buildingName` explicitly (null = technician stock).
// Older requests only have free text in `reason`, typed by the storekeeper as
// "<building> #<flat>" or "<building>\nFLAT NO-<flat>" — this maps that text
// onto the official Buildings list as best it can. Pure, so it's node-testable.

export const STOCK_LABEL = "Stock (no building)";
/** Form value for the stock option (stored as buildingName ""). */
export const STOCK_VALUE = "__STOCK__";

/** Known spellings in old requests → official building name (matched on normalized keys). */
const ALIASES: Record<string, string> = {
	RAYYANTOWER: "AL REYYAN TOWER",
	RAYYAN: "AL REYYAN TOWER",
	GILAYANI: "AL GHALAYINI BUILDING",
	RAMA: "AL QUTAMEE MUWAILEH (RAMA BUILDIN)",
	PALMTOWER: "PALM TOWER 2 / PALM TOWER ASSOCIATION",
	EMIE: "EMIC BUILDING",
	Q3: "BIN HARMAL Q-3",
	Q4: "BIN HARMAL Q-4",
	TECOM: "TECOM BUILDING",
};

/** "AL BASHA- 1 Building" → "BASHA1": uppercase, drop "building", punctuation and a leading "AL". */
function buildingKey(name: string): string {
	return name
		.toUpperCase()
		.replace(/\bBUILDING?\b|\bBUILDIN\b|\bBUILING\b/g, "")
		.replace(/[^A-Z0-9]/g, "")
		.replace(/^AL/, "");
}

/** Tidy free text for display: collapse spaces, "AL KHAN- 3" → "AL KHAN-3". */
function tidy(s: string): string {
	return s.toUpperCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
}

export interface ResolvedBuilding {
	/** Official name when matched, tidied text otherwise; null = stock / not a building. */
	building: string | null;
	location: string | null;
}

export function makeBuildingResolver(officialNames: string[]) {
	const byKey = new Map(officialNames.map((name) => [buildingKey(name), name]));
	const aliasByKey = new Map(Object.entries(ALIASES).map(([k, v]) => [k, v]));

	const matchOfficial = (text: string): string | null => {
		const key = buildingKey(text);
		if (!key) return null;
		return byKey.get(key) ?? aliasByKey.get(key) ?? null;
	};

	/** For legacy requests: parse the first line of `reason` (and a FLAT NO line if present). */
	const fromReason = (reason: string | null): ResolvedBuilding => {
		const lines = (reason ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
		if (lines.length === 0) return { building: null, location: null };

		const [head, ...rest] = lines;
		const hashAt = head.indexOf("#");
		const namePart = hashAt >= 0 ? head.slice(0, hashAt) : head;
		let location = hashAt >= 0 ? head.slice(hashAt + 1).trim() || null : null;
		const flatLine = rest.find((l) => /FLAT|ROOM|SHOP/i.test(l));
		if (!location && flatLine) location = tidy(flatLine.replace(/^FLAT\s*NO\.?\s*-?\s*/i, ""));

		if (/STOCK/i.test(head)) return { building: null, location: null };

		const name = tidy(namePart);
		if (!name) return { building: null, location };
		return { building: matchOfficial(name) ?? name, location };
	};

	return { fromReason, matchOfficial };
}
