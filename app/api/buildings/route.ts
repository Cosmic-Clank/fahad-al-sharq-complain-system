import { NextResponse } from "next/server";
// adjust the import path to your prisma client instance
import prismaClient from "@/lib/prisma";

// import prisma or supabase etc.

export const dynamic = "force-dynamic"; // important in app router

export async function GET() {
	const buildings = await prismaClient.buildings.findMany({ select: { id: true, buildingName: true } }); // replace with your call
	return NextResponse.json(buildings ?? [], {
		headers: { "Cache-Control": "no-store" },
	});
}
