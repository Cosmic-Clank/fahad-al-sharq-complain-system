import Navbar from "./components/Navbar";
import ComplaintForm from "./components/ComplaintForm";
import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

export default async function Home() {
	noStore();
	const buildingRecords = await prisma.buildings.findMany({
		orderBy: { buildingName: "asc" },
		select: { buildingName: true },
	});
	const buildings = buildingRecords.map((b) => b.buildingName);

	return (
		<div className='min-h-screen bg-gradient-to-l from-orange-50 via-orange-100 to-orange-50'>
			<Navbar />
			<ComplaintForm buildings={buildings} />
		</div>
	);
}
