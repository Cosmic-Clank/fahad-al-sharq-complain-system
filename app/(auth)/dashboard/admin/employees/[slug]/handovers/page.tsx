import React from "react";
import prismaClient from "@/lib/prisma";
import HandoversSection from "./components/HandoversSection";

async function page({ params }: { params: Promise<{ slug: string }> }) {
	const slug = (await params).slug;
	const userId = Number(slug);

	const [user, handovers] = await Promise.all([
		prismaClient.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
		prismaClient.passportHandover.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		}),
	]);

	if (!user) return <div className='text-red-500 p-4'>Employee not found.</div>;

	return (
		<HandoversSection
			userId={userId}
			employeeName={user.fullName}
			handovers={handovers.map((h) => ({
				id: h.id,
				status: h.status,
				requestReason: h.requestReason,
				requestedAt: h.requestedAt.toLocaleString(),
				approvedAt: h.approvedAt?.toLocaleString() ?? null,
				handedOverAt: h.handedOverAt?.toLocaleString() ?? null,
				returnedAt: h.returnedAt?.toLocaleString() ?? null,
				handledByAdminName: h.handledByAdminName,
				hasHandoverSignatures: !!(h.employeeSignatureHandoverBase64 && h.adminSignatureHandoverBase64),
				hasReturnSignatures: !!(h.employeeSignatureReturnBase64 && h.adminSignatureReturnBase64),
			}))}
		/>
	);
}

export default page;
