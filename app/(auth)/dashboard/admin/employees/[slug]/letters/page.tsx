import React from "react";
import prismaClient from "@/lib/prisma";
import { todayYmdDubai } from "@/lib/hr-dates";
import { describePenalty } from "@/lib/joint-letters";
import LettersSection from "./components/LettersSection";

async function page({ params }: { params: Promise<{ slug: string }> }) {
	const userId = Number((await params).slug);

	const [user, letters, penalties] = await Promise.all([
		prismaClient.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
		prismaClient.jointLetter.findMany({
			where: { userId },
			orderBy: [{ letterDate: "desc" }, { id: "desc" }],
			// Signatures are large images — not needed for the list
			select: {
				id: true,
				type: true,
				subject: true,
				body: true,
				letterDate: true,
				createdByName: true,
				signedAt: true,
				signedByAdminName: true,
				penalty: { select: { type: true, amount: true, effectiveMonth: true, details: true } },
			},
		}),
		prismaClient.penalty.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			select: { id: true, type: true, amount: true, effectiveMonth: true, details: true },
		}),
	]);
	if (!user) return <div className='text-red-500 p-4'>Employee not found.</div>;

	return (
		<LettersSection
			userId={userId}
			employeeName={user.fullName}
			today={todayYmdDubai()}
			penalties={penalties}
			letters={letters.map((l) => ({
				id: l.id,
				type: l.type,
				subject: l.subject,
				body: l.body,
				letterDate: l.letterDate,
				penaltyLabel: l.penalty ? describePenalty(l.penalty) : null,
				createdByName: l.createdByName,
				signedAt: l.signedAt ? todayYmdDubai(l.signedAt) : null,
				signedByAdminName: l.signedByAdminName,
			}))}
		/>
	);
}

export default page;
