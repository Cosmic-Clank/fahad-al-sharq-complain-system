import React, { ReactNode } from "react";
import ProfileShell from "@/app/(auth)/dashboard/admin/employees/[slug]/components/ProfileShell";

export default async function HrManagerEmployeeProfileLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
	const slug = (await params).slug;
	return (
		<ProfileShell slug={slug} basePath='/dashboard/hr_manager/employees' canEditAccount={false}>
			{children}
		</ProfileShell>
	);
}
