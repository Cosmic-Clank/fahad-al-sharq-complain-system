// components/EmployeeForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button"; // Assuming Shadcn UI Button
import { z } from "zod";
import { Input } from "@/components/ui/input"; // Assuming Shadcn UI Input
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // Assuming Shadcn UI Form components

import { createEmployee } from "../actions"; // Import your new server action
import { useRouter } from "next/navigation"; // For client-side redirects
import { Loading } from "@/components/ui/loading";

// Define the Zod schema for employee creation
// IMPORTANT: This schema should match the one in your server action for client-side validation
const employeeFormSchema = z.object({
	fullName: z.string({ required_error: "Full name is required" }).min(2, { message: "Full name must be at least 2 characters long." }).max(100, { message: "Full name must be at most 100 characters long." }),
	username: z.string({ required_error: "Username is required" }),
	password: z.string({ required_error: "Password is required" }),
	// .min(8, { message: "Password must be at least 8 characters long." })
	// .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
	// .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
	// .regex(/[0-9]/, { message: "Password must contain at least one number." })
	// .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character." }),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

function EmployeeForm() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

	const form = useForm<EmployeeFormValues>({
		resolver: zodResolver(employeeFormSchema),
		defaultValues: {
			fullName: "",
			username: "",
			password: "",
		},
	});

	// Handle form submission
	const onSubmit = async (values: EmployeeFormValues) => {
		setIsSubmitting(true);
		setSubmitError(null); // Clear previous errors
		setSubmitSuccess(null); // Clear previous success messages

		const formData = new FormData();
		formData.append("fullName", values.fullName);
		formData.append("username", values.username);
		formData.append("password", values.password);

		try {
			const result = await createEmployee(formData); // Call the server action

			if (result.success) {
				setSubmitSuccess(result.message);
				form.reset(); // Reset form fields on success
				// Optional: Redirect after a short delay or show success and let user navigate
				setTimeout(() => {
					router.push("/dashboard/admin/employees"); // Redirect to the employees list page
				}, 2000);
			} else {
				setSubmitError(result.message || "An unknown error occurred.");
				// If the server action returns specific field errors, you could map them
				// back to react-hook-form fields like this:
				// if (result.errors) {
				//   for (const [field, message] of Object.entries(result.errors)) {
				//     form.setError(field as keyof EmployeeFormValues, { message: message as string });
				//   }
				// }
			}
		} catch (error) {
			console.error("Client-side error during form submission:", error);
			setSubmitError("An unexpected error occurred. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-md'>
				<div className='border-b pb-4'>
					<h2 className='text-2xl font-semibold text-gray-800'>Create New Employee</h2>
					<p className='text-sm text-gray-600 mt-1'>Enter the details for the new employee account.</p>
				</div>

				{/* Full Name */}
				<FormField
					control={form.control}
					name='fullName'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Full Name</FormLabel>
							<FormControl>
								<Input placeholder='John Doe' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Username */}
				<FormField
					control={form.control}
					name='username'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Username</FormLabel>
							<FormControl>
								<Input placeholder='john' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Password */}
				<FormField
					control={form.control}
					name='password'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Password</FormLabel>
							<FormControl>
								<Input placeholder='••••••••' type='password' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{submitError && <p className='text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3'>{submitError}</p>}

				{submitSuccess && <p className='text-green-600 text-sm bg-green-50 border border-green-200 rounded-md p-3'>{submitSuccess}</p>}

				<Button type='submit' className='w-full hover:cursor-pointer' disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<Loading />
							Creating...
						</>
					) : (
						"Create Employee"
					)}
				</Button>
			</form>
		</Form>
	);
}

export default EmployeeForm;
