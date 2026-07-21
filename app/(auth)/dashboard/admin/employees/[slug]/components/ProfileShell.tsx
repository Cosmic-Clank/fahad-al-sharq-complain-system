import prismaClient from "@/lib/prisma";
import { HR_STAFF_ROLES } from "@/lib/hr-roles";
import { format } from "date-fns";
import { User, CalendarDays, History, Badge as IdBadge } from "lucide-react";
import React, { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import EmployeeEditDialog from "./EmployeeEditDialog";
import ProfileTabs from "./ProfileTabs";

interface ProfileShellProps {
	children: ReactNode;
	slug: string;
	basePath?: string; // tab links base, e.g. "/dashboard/hr_manager/employees"
	canEditAccount?: boolean; // username/password edit dialog (admin only)
}

/** Shared employee-profile header + tab bar, used by both the admin and HR-manager route trees. */
export default async function ProfileShell({ children, slug, basePath = "/dashboard/admin/employees", canEditAccount = true }: ProfileShellProps) {
	const employeeId = Number(slug);

	const employee = Number.isFinite(employeeId)
		? await prismaClient.user.findUnique({
				where: {
					id: employeeId,
					role: {
						in: HR_STAFF_ROLES,
					},
				},
				select: {
					id: true,
					fullName: true,
					username: true,
					role: true,
					createdAt: true,
					updatedAt: true,
				},
		  })
		: null;

	if (!employee) {
		return <div className='text-red-500 p-6'>Employee not found.</div>;
	}

	return (
		<div className='w-full px-4 sm:px-6 lg:px-12 py-8 space-y-6'>
			{/* Header Card */}
			<div className='w-full bg-white/60 backdrop-blur-md rounded-xl border border-primary/20 shadow-sm p-4 sm:p-6 space-y-4'>
				<div className='flex items-center justify-between flex-wrap gap-4'>
					<h1 className='text-2xl sm:text-3xl font-semibold text-primary flex items-center gap-2'>
						<User className='w-6 h-6 shrink-0' />
						{employee.fullName}
					</h1>
					{canEditAccount && <EmployeeEditDialog employee={employee} />}
				</div>
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

			{/* Tab bar */}
			<ProfileTabs employeeId={employee.id} basePath={basePath} />

			{/* Active tab content */}
			<div>{children}</div>
		</div>
	);
}
