import React from "react";
import AlertsView from "./AlertsView";

async function page() {
	return <AlertsView employeesBase='/dashboard/admin/employees' />;
}

export default page;
