import { auth } from "@/auth";
import React, { ReactNode } from "react";
import NotAuthorized from "../components/NotAuthorized";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/(auth)/dashboard/inventory_manager/components/app-sidebar";
import { AppHeader } from "./components/app-header";

interface InventoryManagerLayoutProps {
	children: ReactNode;
}

const InventoryManagerLayout: React.FC<InventoryManagerLayoutProps> = async ({ children }) => {
	const session = await auth();

	if (!session || !session.user || !session.user.id || !session.user.name) {
		return <NotAuthorized />;
	}

	const role = (session.user as any).role;

	if (!role || role !== "INVENTORY_MANAGER") {
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

export default InventoryManagerLayout;
