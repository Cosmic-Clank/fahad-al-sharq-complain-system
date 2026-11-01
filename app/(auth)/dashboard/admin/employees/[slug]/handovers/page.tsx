import React from "react";
import prismaClient from "@/lib/prisma";
import HandoversSection from "./components/HandoversSection";
import { withRole } from "@/lib/page-guard";
import { formatDubaiDateTime } from "@/lib/dubai-time";

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
				requestedAt: formatDubaiDateTime(h.requestedAt),
				approvedAt: h.approvedAt ? formatDubaiDateTime(h.approvedAt) : null,
				handedOverAt: h.handedOverAt ? formatDubaiDateTime(h.handedOverAt) : null,
				returnedAt: h.returnedAt ? formatDubaiDateTime(h.returnedAt) : null,
				handledByAdminName: h.handledByAdminName,
				hasHandoverSignatures: !!(h.employeeSignatureHandoverBase64 && h.adminSignatureHandoverBase64),
				hasReturnSignatures: !!(h.employeeSignatureReturnBase64 && h.adminSignatureReturnBase64),
			}))}
		/>
	);
}

export default withRole(["ADMIN", "HR_MANAGER"], page);