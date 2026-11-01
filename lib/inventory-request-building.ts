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

/**
 * Every building that has been on the official list (as of Oct 2026). Buildings
 * can be removed from the Buildings page later, but their old requests must
 * still group under one proper name — so matching also checks this list.
 */
const KNOWN_BUILDINGS = [
	"AL BASHA-1",
	"AL BASHA-3",
	"AL BASHA-5",
	"AL BASHA-6",
	"AL BASHA-7",
	"AL BASHA-8",
	"AL BASHA-9",
	"AL GARHOUD BUILDING",
	"AL GHALAYINI BUILDING",
	"Al Khan-3 Building",
	"AL Majaz -1",
	"AL Majaz -2",
	"AL QUTAMEE MUWAILEH (RAMA BUILDIN)",
	"AL REYYAN TOWER",
	"BIN HARMAL Q-3",
	"BIN HARMAL Q-4",
	"EMIC BUILDING",
	"HAMDAN BUILDING",
	"MANAL ATTAR VILLA",
	"PALM TOWER 2 / PALM TOWER ASSOCIATION",
	"TECOM BUILDING",
	"UMM AL SHAIF BIG BUILDING",
	"UMM AL SHAIF SMALL BUILDING",
];

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

/**
 * Call once per report and feed requests in a stable order (e.g. by id):
 * unmatched spellings are grouped under the first spelling seen.
 */
export function makeBuildingResolver(officialNames: string[]) {
	// Current official names win; buildings removed since are still recognised
	const byKey = new Map([...KNOWN_BUILDINGS, ...officialNames].map((name) => [buildingKey(name), name]));
	const aliasByKey = new Map(Object.entries(ALIASES).map(([k, v]) => [k, byKey.get(buildingKey(v)) ?? v]));
	// Unmatched spellings that differ only in punctuation/spacing share one label ("S.K NASIR" = "SK NASIR")
	const labelByKey = new Map<string, string>();

	const matchOfficial = (text: string): string | null => {
		const key = buildingKey(text);
		if (!key) return null;
		return byKey.get(key) ?? aliasByKey.get(key) ?? null;
	};

	const resolveName = (name: string): { building: string; location: string | null } => {
		const direct = matchOfficial(name);
		if (direct) return { building: direct, location: null };
		// "MAJAZ 2 203" → building "MAJAZ 2" + flat "203"
		const trailing = name.match(/^(.+?)\s+(\d{2,4})$/);
		const prefixMatch = trailing ? matchOfficial(trailing[1]) : null;
		if (trailing && prefixMatch) return { building: prefixMatch, location: trailing[2] };
		const key = buildingKey(name);
		if (!labelByKey.has(key)) labelByKey.set(key, name);
		return { building: labelByKey.get(key)!, location: null };
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
		const resolved = resolveName(name);
		return { building: resolved.building, location: location ?? resolved.location };
	};

	return { fromReason, matchOfficial };
}
