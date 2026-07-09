import React from "react";
import prismaClient from "@/lib/prisma";
import HrProfileForm from "./components/HrProfileForm";

async function page({ params }: { params: Promise<{ slug: string }> }) {
	const slug = (await params).slug;
	const userId = Number(slug);

	const profile = await prismaClient.employeeProfile.findUnique({ where: { userId } });

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
		</div>
	);
}

export default page;
