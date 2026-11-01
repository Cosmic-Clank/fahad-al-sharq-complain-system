import React from "react";
import LeaveRequestsView from "./LeaveRequestsView";
import { withRole } from "@/lib/page-guard";

async function page() {
	return <LeaveRequestsView employeesBase='/dashboard/admin/employees' />;
}

export default withRole(["ADMIN"], page);