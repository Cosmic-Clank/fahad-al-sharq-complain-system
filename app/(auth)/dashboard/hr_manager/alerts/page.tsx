import React from "react";
import AlertsView from "@/app/(auth)/dashboard/admin/hr/alerts/AlertsView";
import { withRole } from "@/lib/page-guard";

async function page() {
	return <AlertsView employeesBase='/dashboard/hr_manager/employees' />;
}

export default withRole(["HR_MANAGER"], page);