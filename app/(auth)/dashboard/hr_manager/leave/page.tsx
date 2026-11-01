import React from "react";
import LeaveRequestsView from "@/app/(auth)/dashboard/admin/hr/leave/LeaveRequestsView";
import { withRole } from "@/lib/page-guard";

async function page() {
	return <LeaveRequestsView employeesBase='/dashboard/hr_manager/employees' />;
}

export default withRole(["HR_MANAGER"], page);