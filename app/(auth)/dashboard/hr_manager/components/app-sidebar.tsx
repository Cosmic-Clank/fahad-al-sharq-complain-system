import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Users, CalendarCheck, BellRing } from "lucide-react";
import { LogoutForm } from "./LogoutForm";
import Image from "next/image";

const hrItems = [
	{
		title: "Employees",
		url: "/dashboard/hr_manager/employees",
		icon: Users,
	},
	{
		title: "Attendance",
		url: "/dashboard/hr_manager/attendance",
		icon: CalendarCheck,
	},
	{
		title: "Document Alerts",
		url: "/dashboard/hr_manager/alerts",
		icon: BellRing,
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
					<SidebarGroupLabel>HR</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{hrItems.map((item) => (
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
