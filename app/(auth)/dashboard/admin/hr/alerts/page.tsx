import React from "react";
import AlertsView from "./AlertsView";
import { withRole } from "@/lib/page-guard";

async function page() {
	return <AlertsView employeesBase='/dashboard/admin/employees' />;
}

export default withRole(["ADMIN"], page);