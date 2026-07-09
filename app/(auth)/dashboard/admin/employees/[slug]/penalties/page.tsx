import React from "react";
import prismaClient from "@/lib/prisma";
import PenaltiesSection from "./components/PenaltiesSection";

async function page({ params }: { params: Promise<{ slug: string }> }) {
	const slug = (await params).slug;
	const userId = Number(slug);

	const [penalties, bonuses] = await Promise.all([
		prismaClient.penalty.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		}),
		prismaClient.bonus.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		}),
	]);

	return (
		<PenaltiesSection
			userId={userId}
			penalties={penalties.map((p) => ({
				id: p.id,
				type: p.type,
				amount: p.amount,
				details: p.details,
				note: p.note,
				decidedBy: p.decidedBy,
				effectiveMonth: p.effectiveMonth,
				isAutomatic: p.isAutomatic,
				letterFileUrl: p.letterFileUrl,
				createdAt: p.createdAt.toDateString(),
			}))}
			bonuses={bonuses.map((b) => ({
				id: b.id,
				amount: b.amount,
				note: b.note,
				month: b.month,
				createdAt: b.createdAt.toDateString(),
			}))}
		/>
	);
}

export default page;
