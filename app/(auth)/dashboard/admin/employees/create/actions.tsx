// actions/employee-actions.ts
"use server";

import { z } from "zod";
import prismaClient from "@/lib/prisma"; // Your Prisma client instance
import bcrypt from "bcryptjs"; // For password hashing
import { revalidatePath } from "next/cache";

// Server-side Zod schema for validation
const serverEmployeeFormSchema = z.object({
	fullName: z.string({ required_error: "Full name is required" }).min(2, { message: "Full name must be at least 2 characters long." }).max(100, { message: "Full name must be at most 100 characters long." }),
	email: z.string({ required_error: "Email is required" }).email({ message: "Please enter a valid email address." }),
	password: z.string({ required_error: "Password is required" }),
	// .min(8, { message: "Password must be at least 8 characters long." })
	// .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
	// .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
	// .regex(/[0-9]/, { message: "Password must contain at least one number." })
	// .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character." }),
});

export async function createEmployee(formData: FormData) {
	const data = {
		fullName: formData.get("fullName"),
		email: formData.get("email"),
		password: formData.get("password"),
	};

	try {
		// 1. Validate data using Zod
		const validatedData = serverEmployeeFormSchema.parse(data);

		// 2. Check if email already exists
		const existingUser = await prismaClient.user.findUnique({
			where: { email: validatedData.email },
		});

		if (existingUser) {
			return { success: false, message: "Email already registered.", errors: { email: "Email already in use." } };
		}

		// 3. Hash the password
		const hashedPassword = await bcrypt.hash(validatedData.password, 12); // 10 rounds recommended

		// 4. Create the employee (user) in the database
		await prismaClient.user.create({
			data: {
				fullName: validatedData.fullName,
				email: validatedData.email,
				passwordHash: hashedPassword,
				role: "EMPLOYEE", // Assign a default role
			},
		});

		// 5. Revalidate any relevant paths or redirect
		revalidatePath("/dashboard/admin/employees"); // Revalidate cache for the employees list page
		// Or, if you want a full redirect after success (e.g., to a dashboard)
		// redirect("/dashboard/admin/employees");

		return { success: true, message: "Employee created successfully!" };
	} catch (error) {
		if (error instanceof z.ZodError) {
			// Return validation errors to the client
			const errors = error.flatten().fieldErrors;
			return { success: false, message: "Validation failed.", errors };
		}
		console.error("Error creating employee:", error);
		return { success: false, message: "Failed to create employee. Please try again." };
	}
}
