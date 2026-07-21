import React from "react";
import AlertsView from "@/app/(auth)/dashboard/admin/hr/alerts/AlertsView";

async function page() {
	return <AlertsView employeesBase='/dashboard/hr_manager/employees' />;
}

export default page;
