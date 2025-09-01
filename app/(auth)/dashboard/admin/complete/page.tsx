import React from "react";
import ComplaintsTable from "../../components/ComplaintsTable";

async function page() {
	return <ComplaintsTable status='Completed' role='admin' />;
}

export default page;
