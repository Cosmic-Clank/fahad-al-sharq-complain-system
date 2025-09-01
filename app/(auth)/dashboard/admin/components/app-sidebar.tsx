import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Home, LogOut, LucideOctagon, PersonStanding, User, Building, Paperclip, Book, Cross, Check, AlertCircle } from "lucide-react";
import { LogoutForm } from "./LogoutForm";
import Image from "next/image";

const items = [
	{
		title: "All",
		url: "/dashboard/admin",
		icon: Home,
	},
	{
		title: "Complete",
		url: "/dashboard/admin/complete",
		icon: Check,
	},
	{
		title: "Incomplete",
		url: "/dashboard/admin/incomplete",
		icon: Cross,
	},
	{
		title: "Pending",
		url: "/dashboard/admin/pending",
		icon: AlertCircle,
	},
	{
		title: "Employees",
		url: "/dashboard/admin/employees",
		icon: User,
	},
	{
		title: "Customers",
		url: "/dashboard/admin/customers",
		icon: PersonStanding,
	},
	{
		title: "Buildings",
		url: "/dashboard/admin/buildings",
		icon: Building,
	},
	{
		title: "Reports",
		url: "/dashboard/admin/reports",
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
