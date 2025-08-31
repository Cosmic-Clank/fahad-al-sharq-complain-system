import { NextResponse } from "next/server";
// adjust the import path to your prisma client instance
import prisma from "@/lib/prisma";

export async function GET() {
	try {
		const buildings = await prisma.buildings.findMany();
		return NextResponse.json(buildings, { status: 200 });
	} catch (error) {
		console.error("Failed to fetch buildings:", error);
		return NextResponse.json({ error: "Failed to fetch buildings" }, { status: 500 });
	}
}
