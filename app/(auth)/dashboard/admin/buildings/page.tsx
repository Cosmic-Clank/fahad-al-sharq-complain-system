// app/buildings/page.tsx
import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import BuildingsClient from "./BuildingsClient";

export default async function BuildingsPage() {
	noStore(); // always fresh
	const buildings = await prisma.buildings.findMany({
		orderBy: { buildingName: "asc" },
		select: { id: true, buildingName: true, emirate: true },
	});

	return (
		<BuildingsClient
			buildings={buildings.map((b) => ({
				id: String(b.id),
				buildingName: b.buildingName,
				emirate: b.emirate,
			}))}
		/>
	);
}
