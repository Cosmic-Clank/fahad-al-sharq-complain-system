import React from "react";
import CustomDataTable from "./data-table";
import prismaClient from "@/lib/prisma";
import { auth } from "@/auth";

async function ComplaintsTable({ role }: { role: "admin" | "employee" }) {
	const session = await auth(); // Get the current user session
	const data = await prismaClient.complaint.findMany({
		select: {
			id: true,
			assignedTo: true,
			customerName: true,
			customerEmail: true,
			customerPhone: true,
			buildingName: true,
			apartmentNumber: true,
			convenientTime: true,
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

	const currentUser = {
		fullName: session!.user!.name!,
		role: (session!.user as any).role,
		username: (session!.user as any).username,
	};

	const timeLabels = {
		EIGHT_AM_TO_TEN_AM: "8am to 10am",
		TEN_AM_TO_TWELVE_PM: "10am to 12pm",
		TWELVE_PM_TO_TWO_PM: "12pm to 2pm",
		TWO_PM_TO_FOUR_PM: "2pm to 4pm",
	};

	const formattedData = data.map((item) => ({
		...item,
		id: String(item.id),
		customerEmail: item.customerEmail || "-",

		createdAt: item.createdAt.toDateString(),
		assignedTo: item.assignedTo ? item.assignedTo.username : null,
		convenientTime: timeLabels[item.convenientTime],

		status: item.workTimes.length > 0 ? (item.workTimes[item.workTimes.length - 1].endTime ? "Completed" : "In Progress") : "Incomplete",
		completedBy: item.workTimes.length > 0 ? item.workTimes[item.workTimes.length - 1].user.fullName : null,
		completedOn: item.workTimes.length > 0 ? item.workTimes[item.workTimes.length - 1].date.toDateString() : null,
	}));
	formattedData.sort((a, b) => {
		const isCurrentUserA = a.assignedTo === currentUser.username;
		const isCurrentUserB = b.assignedTo === currentUser.username;
		if (isCurrentUserA === isCurrentUserB) return 0;
		return isCurrentUserA ? -1 : 1;
	});
	return (
		<>
			<CustomDataTable data={formattedData} role={role} currentUser={currentUser} />
		</>
	);
}

export default ComplaintsTable;
