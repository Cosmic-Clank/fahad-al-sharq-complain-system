import React from "react";
import ComplaintsTable from "../../components/ComplaintsTable";

async function page() {
	return <ComplaintsTable status='Incomplete' role='admin' />;
}

export default page;
