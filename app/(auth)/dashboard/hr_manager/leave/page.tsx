import React from "react";
import LeaveRequestsView from "@/app/(auth)/dashboard/admin/hr/leave/LeaveRequestsView";

async function page() {
	return <LeaveRequestsView employeesBase='/dashboard/hr_manager/employees' />;
}

export default page;
