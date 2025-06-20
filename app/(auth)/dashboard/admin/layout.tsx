import { auth } from "@/auth";
import React, { ReactNode } from "react";
import NotAuthorized from "../components/NotAuthorized";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/(auth)/dashboard/admin/components/app-sidebar";
import { AppHeader } from "./components/app-header";

interface AdminLayoutProps {
	children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = async ({ children }) => {
	const session = await auth();

	if (!session || !session.user || !session.user.id || !session.user.name) {
		return <NotAuthorized />;
	}

	const role = (session.user as any).role;

	if (!role || role !== "ADMIN") {
		return <NotAuthorized />;
	}

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}>
			<AppSidebar />
			<SidebarInset>
				<main>
					<AppHeader name={session.user.name} />
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
};

export default AdminLayout;
