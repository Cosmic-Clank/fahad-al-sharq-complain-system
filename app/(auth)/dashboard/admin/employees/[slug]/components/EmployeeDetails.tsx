import prismaClient from "@/lib/prisma";
import { format } from "date-fns";
import { User, CalendarDays, Clock, AlertTriangle, CheckCircle, History, Badge as IdBadge } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";

export default async function EmployeeDetails({ slug }: { slug: string }) {
	const employeeId = Number(slug);

	const employee = await prismaClient.user.findUnique({
		where: {
			id: employeeId,
			role: "EMPLOYEE",
		},
		select: {
			id: true,
			fullName: true,
			username: true,
			role: true,
			createdAt: true,
			updatedAt: true,
			workTimes: {
				orderBy: { date: "desc" },
				select: {
					id: true,
					date: true,
					startTime: true,
					endTime: true,
					createdAt: true,
					updatedAt: true,
					complaint: {
						select: {
							id: true,
							description: true,
							createdAt: true,
							updatedAt: true,
						},
					},
				},
			},
		},
	});

	if (!employee) {
		return <div className='text-red-500 p-6'>Employee not found.</div>;
	}

	return (
		<div className='w-full px-4 sm:px-6 lg:px-12 py-8 space-y-10'>
			{/* Header Card */}
			<div className='w-full bg-white/60 backdrop-blur-md rounded-xl border border-primary/20 shadow-sm p-4 sm:p-6 space-y-4'>
				<h1 className='text-2xl sm:text-3xl font-semibold text-primary flex items-center gap-2 flex-wrap'>
					<User className='w-6 h-6 shrink-0' />
					{employee.fullName}
				</h1>
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-700'>
					<div className='flex items-center gap-2 min-w-0'>
						<IdBadge className='w-4 h-4 text-primary shrink-0' />
						<span className='font-medium'>Username:</span> <span className='truncate'>{employee.username}</span>
					</div>
					<div className='flex items-center gap-2 min-w-0'>
						<Badge variant='outline' className='uppercase text-xs bg-primary/10 text-primary'>
							{employee.role}
						</Badge>
					</div>
					<div className='flex items-center gap-2 min-w-0'>
						<CalendarDays className='w-4 h-4 text-primary shrink-0' />
						<span className='font-medium'>Joined:</span> {format(new Date(employee.createdAt), "PPP")}
					</div>
					<div className='flex items-center gap-2 min-w-0'>
						<History className='w-4 h-4 text-primary shrink-0' />
						<span className='font-medium'>Updated:</span> {format(new Date(employee.updatedAt), "PPP")}
					</div>
				</div>
			</div>

			{/* Timeline */}
			<div className='relative border-l-2 border-primary/30 pl-4 sm:pl-6 space-y-10'>
				<h2 className='text-xl sm:text-2xl font-semibold text-primary flex items-center gap-2 mb-2'>
					<Clock className='w-5 h-5' />
					Work Timeline
				</h2>

				{employee.workTimes.length === 0 ? (
					<p className='text-gray-500'>No work time entries found.</p>
				) : (
					employee.workTimes.map((wt) => (
						<div key={wt.id} className='relative pl-6 sm:pl-8'>
							{/* Dot on the timeline */}
							<div className='absolute left-[-10px] sm:left-[-12px] top-2 w-4 h-4 bg-primary rounded-full border-4 border-white shadow-md' />

							<div className='bg-white/60 backdrop-blur-sm rounded-lg shadow-sm p-4 border border-gray-200'>
								<div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 mb-2 text-sm'>
									<span className='font-semibold text-primary'>
										{format(new Date(wt.date), "PPP")} • {wt.startTime.toLocaleTimeString()} – {wt.endTime?.toLocaleTimeString() || "N/A"}
									</span>
									<span className='text-xs text-gray-500'>Logged: {format(new Date(wt.createdAt), "PPP p")}</span>
								</div>

								<div className='text-xs text-gray-600 mb-3'>Last Updated: {format(new Date(wt.updatedAt), "PPP p")}</div>

								{wt.complaint ? (
									<div className='bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-md flex flex-col sm:flex-row gap-2 items-start'>
										<div className='flex gap-2 items-start'>
											<AlertTriangle className='w-4 h-4 mt-1 text-red-600 shrink-0' />
											<div>
												<p className='font-medium'>Complaint:</p>
												<p>{wt.complaint.description}</p>
												<p className='text-xs text-red-500 mt-1'>Created: {format(new Date(wt.complaint.createdAt), "PPP p")}</p>
											</div>
										</div>
									</div>
								) : (
									<div className='text-green-600 text-sm flex items-center gap-2'>
										<CheckCircle className='w-4 h-4 shrink-0' />
										No complaints for this shift.
									</div>
								)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
