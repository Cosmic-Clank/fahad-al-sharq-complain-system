import { auth } from "@/auth";
import React, { ReactNode } from "react";
import NotAuthorized from "../components/NotAuthorized";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { AppHeader } from "./components/app-header";

interface HrManagerLayoutProps {
	children: ReactNode;
}

const HrManagerLayout: React.FC<HrManagerLayoutProps> = async ({ children }) => {
	const session = await auth();

	if (!session || !session.user || !session.user.id || !session.user.name) {
		return <NotAuthorized />;
	}

	const role = (session.user as any).role;

	if (!role || role !== "HR_MANAGER") {
		return <NotAuthorized />;
	}

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 60)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}>
			<AppSidebar />
			<SidebarInset className='overflow-y-hidden'>
				<main className='h-full'>
					<AppHeader name={session.user.name} />
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
};

export default HrManagerLayout;
