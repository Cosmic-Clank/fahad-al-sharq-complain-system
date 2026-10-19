import React from "react";
import SalarySummaryView from "@/app/(auth)/dashboard/admin/hr/salary-summary/SalarySummaryView";

async function page({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
	const { month } = await searchParams;
	return <SalarySummaryView month={month} employeesBase='/dashboard/hr_manager/employees' />;
}

export default page;
