import React from "react";
import CustomDataTable from "./data-table";
import prismaClient from "@/lib/prisma";

async function ComplaintsTable({ role }: { role: "admin" | "employee" }) {
	const data = await prismaClient.complaint.findMany({
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			customerPhone: true,
			buildingName: true,
			area: true,
			description: true,
			createdAt: true,
		},
	});
	const formattedData = data.map((item) => ({
		...item,
		id: String(item.id),
		createdAt: item.createdAt.toDateString(),
	}));
	return (
		<>
			<CustomDataTable data={formattedData} role={role} />
		</>
	);
}

export default ComplaintsTable;
