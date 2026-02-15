import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Home, LogOut, Package, Plus, ArrowUpCircle, CheckCircle, Users, List } from "lucide-react";
import { LogoutForm } from "./LogoutForm";
import Image from "next/image";

const inventoryItems = [
	{
		title: "All Items",
		url: "/dashboard/inventory_manager",
		icon: Package,
	},
	{
		title: "Transactions",
		url: "/dashboard/inventory_manager/transactions",
		icon: List,
	},
	{
		title: "Restock",
		url: "/dashboard/inventory_manager/restock/0",
		icon: ArrowUpCircle,
	},
	{
		title: "New Item",
		url: "/dashboard/inventory_manager/new",
		icon: Plus,
	},
];

const employeeItems = [
	{
		title: "Requests",
		url: "/dashboard/inventory_manager/employees/requests",
		icon: Users,
	},
];

export function AppSidebar() {
	return (
		<Sidebar variant='inset' collapsible='icon'>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild className='data-[slot=sidebar-menu-button]:!p-1.5'>
							<a href='/'>
								<Image width={5} height={5} alt='logo' src={"/favicon.png"} className='!size-5' />
								<span className='text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500'>Fahad Al Sharq</span>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Inventory</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{inventoryItems.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild>
										<a href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel>Employees</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{employeeItems.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild>
										<a href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild>
							<LogoutForm />
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
