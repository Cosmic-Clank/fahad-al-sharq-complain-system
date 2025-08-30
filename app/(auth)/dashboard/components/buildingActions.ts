"use server";

import prisma from "@/lib/prisma";

// Shared type
export type Building = {
	buildingName: string;
	emirate: string;
};

/**
 * Get the list of unique emirates present in the Buildings table.
 * Sorted with a small priority order (Ajman, Sharjah, Dubai) then alpha.
 */
export async function getEmirates(): Promise<string[]> {
	const rows = await prisma.buildings.findMany({
		select: { emirate: true },
	});

	const set = new Set<string>();
	for (const r of rows) {
		if (r.emirate) set.add(cap(r.emirate));
	}

	const priority = ["Ajman", "Sharjah", "Dubai"];
	const list = Array.from(set);
	list.sort((a, b) => {
		const ia = priority.indexOf(a);
		const ib = priority.indexOf(b);
		if (ia !== -1 && ib !== -1) return ia - ib;
		if (ia !== -1) return -1;
		if (ib !== -1) return 1;
		return a.localeCompare(b);
	});

	return list;
}

/**
 * Get all buildings for a specific emirate.
 */
export async function getBuildingsByEmirate(emirate: string): Promise<Building[]> {
	const rows = await prisma.buildings.findMany({
		where: { emirate: { equals: emirate, mode: "insensitive" } },
		select: { buildingName: true, emirate: true },
		orderBy: { buildingName: "asc" },
	});

	// normalize capitalization
	return rows.map((r) => ({ buildingName: r.buildingName, emirate: cap(r.emirate) }));
}

function cap(s: string) {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1);
}
