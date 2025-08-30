import React from "react";
import CustomDataTable from "./data-table";
import prismaClient from "@/lib/prisma";
import { auth } from "@/auth";

async function ComplaintsTable({ role, complete }: { role: "admin" | "employee"; complete?: boolean }) {
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
		FOUR_PM_TO_SIX_PM: "4pm to 6pm",
		SIX_PM_TO_EIGHT_PM: "6pm to 8pm",
		EIGHT_PM_TO_TEN_PM: "8pm to 10pm",
		TEN_PM_TO_TWELVE_AM: "10pm to 12am",
		TWELVE_AM_TO_TWO_AM: "12am to 2am",
		TWO_AM_TO_FOUR_AM: "2am to 4am",
		FOUR_AM_TO_SIX_AM: "4am to 6am",
		SIX_AM_TO_EIGHT_AM: "6am to 8am",
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
	if (complete === true) {
		return (
			<>
				<CustomDataTable data={formattedData.filter((item) => (complete ? item.status === "Completed" : item.status !== "Completed"))} role={role} currentUser={currentUser} />
			</>
		);
	}
	if (complete === false) {
		return (
			<>
				<CustomDataTable data={formattedData.filter((item) => (complete ? item.status === "Incomplete" : item.status !== "Completed"))} role={role} currentUser={currentUser} />
			</>
		);
	}
	return (
		<>
			<CustomDataTable data={formattedData} role={role} currentUser={currentUser} />
		</>
	);
}

export default ComplaintsTable;
