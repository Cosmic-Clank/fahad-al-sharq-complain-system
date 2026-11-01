import React from "react";
import ComplaintsTable from "../../components/ComplaintsTable";
import { withRole } from "@/lib/page-guard";

async function page() {
	return <ComplaintsTable privateOnly status='In Progress' role='employee' />;
}

export default withRole(["EMPLOYEE"], page);