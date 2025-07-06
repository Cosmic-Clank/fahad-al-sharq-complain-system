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
			<LogOut />

			<button type='submit' className='hover:cursor-pointer'>
				Logout
			</button>
		</form>
	);
}
