// components/LoginForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/ui/loading";

// Client-side Zod schema for login (should match server-side)
const loginFormSchema = z.object({
	username: z.string({ required_error: "Username is required" }),
	password: z.string({ required_error: "Password is required" }).min(1, { message: "Password cannot be empty." }),
});

function LoginForm() {
	const router = useRouter();
	const [loginError, setLoginError] = React.useState<string | null>(null);

	const form = useForm<z.infer<typeof loginFormSchema>>({
		resolver: zodResolver(loginFormSchema),
		defaultValues: {
			username: "",
			password: "",
		},
	});

	// The form submission handler for react-hook-form
	const onSubmit = async (values: z.infer<typeof loginFormSchema>) => {
		setLoginError(null); // Clear previous errors

		const formData = new FormData();
		formData.append("username", values.username);
		formData.append("password", values.password);

		try {
			// Import the server action directly and call it
			const { authenticate } = await import("../actions"); // Dynamic import for client component
			const result = await authenticate(formData); // `undefined` for prevState

			if (!result.success) {
				// If the server action returns a string, it's an error message
				setLoginError(result.message); // Cast to string as per server action's return type for errors
				return;
			}
			router.push("/dashboard"); // Redirect to the dashboard on successful login
			// If `result` is undefined, it means the redirect happened successfully on the server.
			// No need for client-side redirection here.
		} catch (error: any) {
			console.error("Client-side error during login:", error);
			// Catch any unexpected client-side errors, or re-thrown errors from the server action
			setLoginError(error.message || "An unexpected error occurred. Please try again.");
		}
	};

	return (
		<div className='min-h-screen bg-gradient-to-l from-blue-50 via-blue-100 to-blue-50 flex items-center justify-center'>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className='max-w-2xl space-y-6 mx-auto p-4 bg-white shadow-md rounded-lg border-t-4 border-primary'>
					<div className=''>
						<h2 className='text-2xl font-bold mb-4'>Login</h2>
						<p className='text-gray-600 mb-4'>Please enter your credentials to log in.</p>
					</div>

					{/* Email Field */}
					<FormField
						control={form.control}
						name='username'
						render={({ field }) => (
							<FormItem className=''>
								<FormLabel>Username</FormLabel>
								<FormControl>
									<Input placeholder='Enter your username' {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Password Field */}
					<FormField
						control={form.control}
						name='password'
						render={({ field }) => (
							<FormItem className=''>
								<FormLabel>Password</FormLabel>
								<FormControl>
									<Input type='password' placeholder='Enter your password' {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Display Login Error */}
					{loginError && <p className='text-red-500 text-sm mt-2'>{loginError}</p>}

					{/* Submit Button */}
					<Button type='submit' className='w-full hover:cursor-pointer' disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting ? <Loading /> : "Login"}
					</Button>
				</form>
			</Form>
		</div>
	);
}

export default LoginForm;
