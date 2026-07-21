import React from "react";
import prismaClient from "@/lib/prisma";
import { HR_STAFF_ROLES } from "@/lib/hr-roles";
import CustomDataTable from "@/app/(auth)/dashboard/admin/employees/components/data-table";

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
		createdAt: item.createdAt.toDateString(),
	}));
	return <CustomDataTable data={formattedData} basePath='/dashboard/hr_manager/employees' canManage={false} />;
}

export default page;
