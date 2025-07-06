// app/auth/actions.ts
"use server";

import { z } from "zod";
import { signIn } from "@/auth"; // Import signIn from your NextAuth config
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

// Server-side Zod schema for login
const loginSchema = z.object({
	username: z.string().min(1, { message: "Username cannot be empty." }),
	password: z.string().min(1, { message: "Password cannot be empty." }),
});

export async function authenticate(formData: FormData) {
	const rawData = {
		username: formData.get("username"),
		password: formData.get("password"),
	};

	const validatedFields = loginSchema.safeParse(rawData);

	if (!validatedFields.success) {
		// Return validation errors if they exist
		return {
			success: false,
			message: "Invalid input",
		};
	}

	const { username, password } = validatedFields.data;

	try {
		// Call NextAuth's signIn function
		await signIn("credentials", {
			username,
			password,
			redirect: false, // Prevent NextAuth from redirecting automatically
			// We'll handle redirection manually after checking the result
		});
		return {
			success: true,
			message: "Sign-in successful",
		};

		// If signIn is successful, redirect to a protected page (e.g., dashboard)
	} catch (error) {
		// Handle specific NextAuth errors
		if (error instanceof AuthError) {
			console.error("Authentication error:", error);
			return { success: false, message: "Invalid Credentials" };
		}
		console.error("Unexpected authentication error:", error);
		return { success: false, message: "An unexpected error occurred. Please try again." };
	}
}
