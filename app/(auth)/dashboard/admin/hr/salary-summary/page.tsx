import React from "react";
import SalarySummaryView from "./SalarySummaryView";
import { withRole } from "@/lib/page-guard";

async function page({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
	const { month } = await searchParams;
	return <SalarySummaryView month={month} employeesBase='/dashboard/admin/employees' />;
}

export default withRole(["ADMIN"], page);