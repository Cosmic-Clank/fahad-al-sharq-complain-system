import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
export async function AppHeader({ name }: { name: string }) {
	return (
		<header className='flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)'>
			<div className='flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6'>
				<SidebarTrigger className='-ml-1' />
				<Separator orientation='vertical' className='mx-2 data-[orientation=vertical]:h-4' />
				<h1 className='text-base font-medium'>Dashboard</h1>
				<div className='ml-auto flex items-center gap-2'>
					<Avatar>
						<AvatarImage src={"https://static.vecteezy.com/system/resources/thumbnails/009/636/683/small_2x/admin-3d-illustration-icon-png.png"} alt={"admin profile picture"} />
						<AvatarFallback>{name.charAt(0)}</AvatarFallback>
					</Avatar>
					{name}
				</div>
			</div>
		</header>
	);
}
