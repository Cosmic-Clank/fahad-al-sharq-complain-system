import React from "react";
import CustomDataTable from "./components/data-table";
import prismaClient from "@/lib/prisma";

async function page() {
	const data = await prismaClient.user.findMany({
		select: {
			id: true,
			fullName: true,
			email: true,
			createdAt: true,
		},
		where: {
			role: "EMPLOYEE",
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
