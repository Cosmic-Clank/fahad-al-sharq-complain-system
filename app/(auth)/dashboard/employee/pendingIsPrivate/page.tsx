import React from "react";
import ComplaintsTable from "../../components/ComplaintsTable";

async function page() {
	return <ComplaintsTable status='In Progress' role='employee' />;
}

export default page;
