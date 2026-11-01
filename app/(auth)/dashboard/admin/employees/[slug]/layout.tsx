import React, { ReactNode } from "react";
import ProfileShell from "./components/ProfileShell";
import { withRole } from "@/lib/page-guard";

async function EmployeeProfileLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
	const slug = (await params).slug;
	return (
		<ProfileShell slug={slug} basePath='/dashboard/admin/employees' canEditAccount>
			{children}
		</ProfileShell>
	);
}

export default withRole(["ADMIN", "HR_MANAGER"], EmployeeProfileLayout);
