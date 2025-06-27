import { signOut } from "@/auth";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

export function LogoutForm() {
	return (
		<form
			action={async () => {
				"use server";
				await signOut();
				return redirect("/login"); // Redirect to login page after logout
			}}>
			<LogOut />

			<button type='submit' className='hover:cursor-pointer'>
				Logout
			</button>
		</form>
	);
}
