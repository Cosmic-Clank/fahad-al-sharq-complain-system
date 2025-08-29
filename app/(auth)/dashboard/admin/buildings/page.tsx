// app/buildings/page.tsx
import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import BuildingsClient from "./BuildingsClient";

export default async function BuildingsPage() {
	noStore(); // always fresh on request
	const buildings = await prisma.buildings.findMany({
		orderBy: { buildingName: "asc" },
	});

	// Only pass plain JSON data down to the client component
	return <BuildingsClient buildings={buildings.map((b) => ({ id: String(b.id), buildingName: b.buildingName }))} />;
}
