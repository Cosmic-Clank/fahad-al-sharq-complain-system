import React from "react";
import ComplaintsTable from "../../components/ComplaintsTable";

async function page() {
	return <ComplaintsTable status='Incomplete' role='employee' />;
}

export default page;
