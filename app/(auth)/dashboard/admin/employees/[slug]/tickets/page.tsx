import React from "react";
import prismaClient from "@/lib/prisma";
import TicketsSection from "./components/TicketsSection";

async function page({ params }: { params: Promise<{ slug: string }> }) {
	const slug = (await params).slug;
	const userId = Number(slug);

	const [tickets, profile] = await Promise.all([
		prismaClient.airlineTicket.findMany({
			where: { userId },
			orderBy: { year: "desc" },
			select: { id: true, year: true, destination: true, value: true, notes: true },
		}),
		prismaClient.employeeProfile.findUnique({ where: { userId }, select: { nationality: true } }),
	]);

	return <TicketsSection userId={userId} nationality={profile?.nationality ?? null} tickets={tickets} />;
}

export default page;
