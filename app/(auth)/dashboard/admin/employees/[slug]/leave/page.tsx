import React from "react";
import prismaClient from "@/lib/prisma";
import { todayYmdDubai } from "@/lib/hr-dates";
import { leaveSignatureRequired } from "@/lib/hr-leave";
import { getLeaveRows } from "@/lib/hr-leave-server";
import LeaveSection from "@/app/(auth)/dashboard/admin/hr/leave/LeaveSection";
import { withRole } from "@/lib/page-guard";

async function page({ params }: { params: Promise<{ slug: string }> }) {
	const userId = Number((await params).slug);

	const [user, rows] = await Promise.all([
		prismaClient.user.findUnique({ where: { id: userId }, select: { fullName: true, employeeProfile: { select: { joiningDate: true } } } }),
		getLeaveRows({ userId }),
	]);
	if (!user) return <div className='text-red-500 p-4'>Employee not found.</div>;

	return (
		<LeaveSection
			rows={rows}
			today={todayYmdDubai()}
			recordFor={{ userId, fullName: user.fullName, signatureRequired: leaveSignatureRequired(user.employeeProfile?.joiningDate) }}
			emptyText='No leave recorded for this employee.'
		/>
	);
}

export default withRole(["ADMIN", "HR_MANAGER"], page);