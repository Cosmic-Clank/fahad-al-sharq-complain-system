import React from "react";
import CustomDataTable from "./components/data-table";
import prismaClient from "@/lib/prisma";

async function page() {
	const data = await prismaClient.complaint.findMany({
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			customerPhone: true,
			billNumber: true,
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
			<CustomDataTable data={formattedData} />
		</>
	);
}

export default page;
