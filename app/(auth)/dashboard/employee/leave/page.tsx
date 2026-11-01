import React from "react";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { CalendarHeart } from "lucide-react";
import { todayYmdDubai } from "@/lib/hr-dates";
import { yearsOfServiceCompleted } from "@/lib/hr-payroll";
import { formatLeaveDate, leaveSignatureRequired, LEAVE_SIGNATURE_MIN_YEARS, LEAVE_STATUS_LABELS, LEAVE_STATUS_STYLES, LEAVE_TYPE_LABELS } from "@/lib/hr-leave";
import LeaveRequestForm from "./components/LeaveRequestForm";
import CancelLeaveButton from "./components/CancelLeaveButton";
import { withRole } from "@/lib/page-guard";

async function page() {
	const session = await auth();
	const userId = Number(session?.user?.id);
	if (!userId) return <div className='p-6 text-red-500'>Could not load your account.</div>;

	const [profile, requests] = await Promise.all([
		prismaClient.employeeProfile.findUnique({ where: { userId }, select: { joiningDate: true } }),
		prismaClient.leaveRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
	]);

	const joiningDate = profile?.joiningDate ?? null;
	const signatureRequired = leaveSignatureRequired(joiningDate);
	const years = yearsOfServiceCompleted(joiningDate);
	const signatureReason = !joiningDate
		? "Your joining date is not on record yet, so your signature is required."
		: `You have worked here ${years} year${years === 1 ? "" : "s"} (${LEAVE_SIGNATURE_MIN_YEARS} or more), so your signature is required.`;

	return (
		<div className='p-4 space-y-4 max-w-2xl'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<CalendarHeart className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>My Leave</h1>
				</div>
				<p className='text-gray-600 mt-1'>Ask for time off here. The admin will approve or reject your request — you can see the answer below.</p>
			</div>

			<Card className='p-6'>
				<LeaveRequestForm today={todayYmdDubai()} signatureRequired={signatureRequired} signatureReason={signatureReason} />
			</Card>

			<div className='space-y-3'>
				<h2 className='text-lg font-semibold'>My requests</h2>
				{requests.length === 0 ? (
					<Card className='p-6 text-center text-gray-500 text-sm'>You have not requested any leave yet.</Card>
				) : (
					requests.map((r) => (
						<Card key={r.id} className='p-4 text-sm space-y-2'>
							<div className='flex items-center justify-between gap-2 flex-wrap'>
								<span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${LEAVE_STATUS_STYLES[r.status] ?? ""}`}>{LEAVE_STATUS_LABELS[r.status] ?? r.status}</span>
								{r.status === "PENDING" && <CancelLeaveButton leaveId={r.id} />}
							</div>
							<p className='font-semibold'>
								{r.days} day{r.days === 1 ? "" : "s"} of {LEAVE_TYPE_LABELS[r.type]}
							</p>
							<p className='text-gray-600'>
								{formatLeaveDate(r.startDate)} → {formatLeaveDate(r.endDate)}
							</p>
							{r.reason && <p className='text-gray-500'>{r.reason}</p>}
							{r.decisionNote && (
								<p className='text-gray-700'>
									<span className='font-medium'>Admin note:</span> {r.decisionNote}
								</p>
							)}
						</Card>
					))
				)}
			</div>
		</div>
	);
}

export default withRole(["EMPLOYEE"], page);