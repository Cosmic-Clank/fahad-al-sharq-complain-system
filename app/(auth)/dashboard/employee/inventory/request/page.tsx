import React from "react";
import RequestInventoryForm from "../../../components/RequestInventoryForm";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { withRole } from "@/lib/page-guard";

async function page() {
	const session = await auth();
	const employeeId = (session?.user as any)?.id;

	if (!employeeId) {
		return <div>Error: Could not get user information</div>;
	}

	const buildings = await prismaClient.buildings.findMany({ select: { buildingName: true }, orderBy: { buildingName: "asc" } });

	return <RequestInventoryForm employeeId={employeeId} buildings={buildings.map((b) => b.buildingName)} />;
}

export default withRole(["EMPLOYEE"], page);