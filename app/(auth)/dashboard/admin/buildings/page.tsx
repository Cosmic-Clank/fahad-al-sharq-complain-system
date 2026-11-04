// app/buildings/page.tsx
import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import BuildingsClient from "./BuildingsClient";
import { withRole } from "@/lib/page-guard";

async function BuildingsPage() {
	noStore(); // always fresh
	const buildings = await prisma.buildings.findMany({
		// active first, then by name
		orderBy: [{ isActive: "desc" }, { buildingName: "asc" }],
		select: { id: true, buildingName: true, emirate: true, isActive: true },
	});

	return (
		<BuildingsClient
			buildings={buildings.map((b) => ({
				id: String(b.id),
				buildingName: b.buildingName,
				emirate: b.emirate,
				isActive: b.isActive,
			}))}
		/>
	);
}

export default withRole(["ADMIN"], BuildingsPage);
