import React from "react";
import RequestInventoryForm from "../../../components/RequestInventoryForm";
import { auth } from "@/auth";

async function page() {
	const session = await auth();
	const employeeId = (session?.user as any)?.id;

	if (!employeeId) {
		return <div>Error: Could not get user information</div>;
	}

	return <RequestInventoryForm employeeId={employeeId} />;
}

export default page;
