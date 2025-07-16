import { signOut } from "@/auth";
import { LogOut } from "lucide-react";

export function LogoutForm() {
	return (
		<form
			action={async () => {
				"use server";
				await signOut({
					redirect: true, // Prevent automatic redirect
					redirectTo: "/",
				});
			}}>
			<button type='submit' className='hover:cursor-pointer flex items-center gap-2'>
				<LogOut size={15} />
				Logout
			</button>
		</form>
	);
}
