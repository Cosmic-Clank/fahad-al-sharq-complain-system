import React, { ReactNode } from "react";
import ProfileShell from "@/app/(auth)/dashboard/admin/employees/[slug]/components/ProfileShell";
import { withRole } from "@/lib/page-guard";

async function HrManagerEmployeeProfileLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
	const slug = (await params).slug;
	return (
		<ProfileShell slug={slug} basePath='/dashboard/hr_manager/employees' canEditAccount={false}>
			{children}
		</ProfileShell>
	);
}

export default withRole(["HR_MANAGER"], HrManagerEmployeeProfileLayout);
