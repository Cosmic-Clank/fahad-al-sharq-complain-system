import { signOut } from "@/auth";
import { LogOut } from "lucide-react";

export function LogoutForm() {
	return (
		<form
			action={async () => {
				"use server";
				await signOut();
				window.location.href = "/login"; // Redirect to login page after logout
			}}>
			<LogOut />

			<button type='submit' className='hover:cursor-pointer'>
				Logout
			</button>
		</form>
	);
}
