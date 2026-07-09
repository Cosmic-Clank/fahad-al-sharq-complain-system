import React from "react";
import prismaClient from "@/lib/prisma";
import HrProfileForm from "./components/HrProfileForm";
import LeaveSalaryCard from "./components/LeaveSalaryCard";
import DownloadPdfButton from "@/app/(auth)/dashboard/admin/hr/components/DownloadPdfButton";
import { exportClearancePdf } from "@/app/(auth)/dashboard/admin/hr/hrReportActions";
import { computeLeaveSalary } from "@/lib/hr-payroll";

async function page({ params }: { params: Promise<{ slug: string }> }) {
	const slug = (await params).slug;
	const userId = Number(slug);

	const [profile, leavePenalties] = await Promise.all([
		prismaClient.employeeProfile.findUnique({ where: { userId } }),
		prismaClient.penalty.findMany({
			where: { userId, type: "LEAVE_SALARY_DEDUCTION", amount: { not: null } },
			select: { amount: true },
		}),
	]);

	const leaveSalary = computeLeaveSalary(
		{
			basicSalary: profile?.basicSalary ?? 0,
			joiningDate: profile?.joiningDate ?? null,
			leaveSalaryOverride: profile?.leaveSalaryOverride ?? null,
		},
		leavePenalties.map((p) => p.amount!)
	);

	const initial = {
		nationality: profile?.nationality ?? "",
		joiningDate: profile?.joiningDate ? profile.joiningDate.toISOString().slice(0, 10) : "",
		basicSalary: profile?.basicSalary ?? 0,
		allowances: profile?.allowances ?? 0,
		workStartTime: profile?.workStartTime ?? "09:00",
		leaveSalaryOverride: profile?.leaveSalaryOverride ?? null,
		passportHeldByCompany: profile?.passportHeldByCompany ?? true,
	};

	return (
		<div className='space-y-6'>
			<HrProfileForm userId={userId} initial={initial} />
			<LeaveSalaryCard result={leaveSalary} />
			<div className='max-w-2xl flex justify-end'>
				<DownloadPdfButton getPdf={exportClearancePdf.bind(null, userId)} label='Accounting Clearance Form (PDF)' />
			</div>
		</div>
	);
}

export default page;
