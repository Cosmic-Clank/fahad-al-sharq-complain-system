import React from "react";
import LeaveRequestsView from "./LeaveRequestsView";

async function page() {
	return <LeaveRequestsView employeesBase='/dashboard/admin/employees' />;
}

export default page;
