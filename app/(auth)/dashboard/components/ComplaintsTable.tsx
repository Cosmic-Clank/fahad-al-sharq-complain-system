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
			workTimes: {
				select: {
					id: true,
					date: true,
					startTime: true,
					endTime: true,
					user: {
						select: {
							fullName: true,
							role: true,
						},
					},
				},
				orderBy: { date: "asc" },
			},
		},
	});
	const formattedData = data.map((item) => ({
		...item,
		id: String(item.id),
		createdAt: item.createdAt.toDateString(),

		status: item.workTimes.length > 0 ? (item.workTimes[item.workTimes.length - 1].endTime ? "Completed" : "In Progress") : "Incomplete",
		completedBy: item.workTimes.length > 0 ? item.workTimes[item.workTimes.length - 1].user.fullName : null,
		completedOn: item.workTimes.length > 0 ? item.workTimes[item.workTimes.length - 1].date.toDateString() : null,
	}));
	return (
		<>
			<CustomDataTable data={formattedData} role={role} />
		</>
	);
}

export default ComplaintsTable;
