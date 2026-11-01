import React from "react";
import ComplaintsTable from "../../components/ComplaintsTable";
import { withRole } from "@/lib/page-guard";

async function page() {
	return <ComplaintsTable status='Completed' role='admin' />;
}

export default withRole(["ADMIN"], page);