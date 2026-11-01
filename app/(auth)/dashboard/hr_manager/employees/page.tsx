import React from "react";
import prismaClient from "@/lib/prisma";
import { HR_STAFF_ROLES } from "@/lib/hr-roles";
import CustomDataTable from "@/app/(auth)/dashboard/admin/employees/components/data-table";
import { withRole } from "@/lib/page-guard";
import { dubaiDateString } from "@/lib/dubai-time";

async function page() {
	const data = await prismaClient.user.findMany({
		select: {
			id: true,
			fullName: true,
			username: true,
			createdAt: true,
		},
		where: {
			role: {
				in: HR_STAFF_ROLES,
			},
		},
	});
	const formattedData = data.map((item) => ({
		...item,
		id: String(item.id),
		createdAt: dubaiDateString(item.createdAt),
	}));
	return <CustomDataTable data={formattedData} basePath='/dashboard/hr_manager/employees' canManage={false} />;
}

export default withRole(["HR_MANAGER"], page);