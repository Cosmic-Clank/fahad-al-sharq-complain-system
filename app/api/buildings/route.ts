import { NextResponse } from "next/server";
import prismaClient from "@/lib/prisma";

export async function GET() {
	try {
		const rows = await prismaClient.buildings.findMany({
			select: { buildingName: true, emirate: true },
			orderBy: { buildingName: "asc" },
		});

		return NextResponse.json(rows, { status: 200 });
	} catch (error) {
		console.error("Error fetching buildings:", error);
		return NextResponse.json({ message: "Failed to fetch buildings" }, { status: 500 });
	}
}
