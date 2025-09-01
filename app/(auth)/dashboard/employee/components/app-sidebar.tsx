import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { AlertCircle, Book, Check, Cross, Home, LucideOctagon } from "lucide-react";
import { LogoutForm } from "./LogoutForm";

const items = [
	{
		title: "All",
		url: "/dashboard/employee",
		icon: Home,
	},
	{
		title: "Complete",
		url: "/dashboard/employee/complete",
		icon: Check,
	},
	{
		title: "Incomplete",
		url: "/dashboard/employee/incomplete",
		icon: Cross,
	},
	{
		title: "Pending",
		url: "/dashboard/employee/pending",
		icon: AlertCircle,
	},
	{
		title: "Reports",
		url: "/dashboard/employee/reports",
		icon: Book,
	},
];

export function AppSidebar() {
	return (
		<Sidebar variant='inset' collapsible='icon'>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild className='data-[slot=sidebar-menu-button]:!p-1.5'>
							<a href='#'>
								<LucideOctagon className='!size-5' />
								<span className='text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500'>Fahad Al Sharq</span>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Dashboard</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => (
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
