// app/actions.ts
"use server";

import { z } from "zod";
import prismaClient from "@/lib/prisma"; // Your Prisma client singleton
import { redirect } from "next/navigation";
import fs from "fs/promises"; // Import Node.js file system promises API
import path from "path"; // Import Node.js path module
import { nanoid } from "nanoid"; // For unique file names

// IMPORTANT: Re-define your Zod schema on the server for validation!
// Match this with your client-side formSchema, but enforce server-side validation.
const serverFormSchema = z.object({
	fullname: z.string({ required_error: "Full name is required" }).min(2, { message: "Full name must be at least 2 characters long" }).max(50, { message: "Full name must be at most 50 characters long" }),
	email: z.string({ required_error: "Email is required" }).email({ message: "Enter a valid email address" }),
	phoneNumber: z.string({ required_error: "Phone number is required" }).min(5, { message: "Phone number must be at least 5 characters long" }).max(15, { message: "Phone number must be at most 15 characters long" }),
	address: z.string({ required_error: "Address is required" }).min(5, { message: "Address must be at least 5 characters long" }).max(100, { message: "Address must be at most 100 characters long" }),
	buildingName: z.string({ required_error: "Building name is required" }).min(1, { message: "Building name must be at least 1 character long" }).max(20, { message: "Building name must be at most 20 characters long" }),
	branchArea: z.string({ required_error: "Branch area is required" }).refine((val) => ["Al Nuaimia 1 - Ajman", "Al Jerf - Ajman", "Taawun - Sharjah", "Al Nahda - Sharjah", "Al Khan - Sharjah", "Al Majaz 1 - Sharjah", "Al Majaz 2 - Sharjah", "Abu Shagara - Sharjah", "Al Qasimia - Sharjah", "Muwaileh - Sharjah", "Industrial 15 - Sharjah", "Al Nahda - Dubai", "Al Qusais - Dubai", "Al Garhoud - Dubai", "Warsan - Dubai", "Silicon - Dubai", "Ras al Khor - Dubai", "Al Barsha - Dubai", "DIP - Dubai", "DIC - Dubai"].includes(val), {
		message: "Please select a valid branch area",
	}),
	description: z.string({ required_error: "Description is required" }).min(10, { message: "Description must be at least 10 characters long" }).max(500, { message: "Description must be at most 500 characters long" }),
});

export async function submitComplaint(formData: FormData) {
	// 1. Extract data from FormData
	const rawData = {
		fullname: formData.get("fullname"),
		email: formData.get("email"),
		phoneNumber: formData.get("phoneNumber"),
		address: formData.get("address"),
		buildingName: formData.get("buildingName"),
		branchArea: formData.get("branchArea"),
		description: formData.get("description"),
	};

	// 2. Server-side validation using Zod
	const validatedFields = serverFormSchema.safeParse(rawData);

	if (!validatedFields.success) {
		console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
		return {
			errors: validatedFields.error.flatten().fieldErrors,
			message: "Failed to submit complaint due to validation errors.",
		};
	}

	const { fullname, email, phoneNumber, address, buildingName, branchArea, description } = validatedFields.data;

	// --- Start Image Upload to Local Filesystem ---
	const files = formData.getAll("images") as File[]; // 'images' should match your input name

	const uploadedImagePaths: string[] = []; // This will now store only strings (paths)

	const maxSize = 5 * 1024 * 1024; // 5MB
	const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
	const maxImages = 5;

	if (files.length > maxImages) {
		return { message: `You can upload a maximum of ${maxImages} images.` };
	}

	// Define the base upload directory relative to your project root.
	// Next.js serves static files from 'public'
	// Use a slugified email for the directory name to be file-system safe
	const directoryName = email.replace(/[^a-zA-Z0-9_-]/g, "_"); // Basic slugify
	const uploadDir = path.join(process.cwd(), "public", "uploads", directoryName);

	if (files.length > 0) {
		try {
			// Create the directory if it doesn't exist
			await fs.mkdir(uploadDir, { recursive: true });
		} catch (dirError) {
			console.error(`Error creating upload directory ${uploadDir}:`, dirError);
			return { message: "Failed to create upload directory on server." };
		}
	}

	for (const file of files) {
		// Skip empty file inputs if any (e.g. user selected nothing for an optional upload)
		if (file.size === 0 && file.name === "undefined") continue;

		if (!allowedTypes.includes(file.type) || file.size > maxSize) {
			console.warn(`Skipping invalid file: ${file.name}, type: ${file.type}, size: ${file.size}`);
			return { message: `Invalid file detected: ${file.name}. Max size is 5MB, supported types are ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}.` };
		}

		const fileExtension = path.extname(file.name);
		const uniqueFileName = `${nanoid()}${fileExtension}`; // Generate a unique name for the file
		const filePath = path.join(uploadDir, uniqueFileName); // Absolute path to save the file
		// The web-accessible path relative to the 'public' directory
		const relativeWebPath = `/uploads/${directoryName}/${uniqueFileName}`;

		try {
			// Convert File object to ArrayBuffer then to Buffer for writing
			const buffer = Buffer.from(await file.arrayBuffer());
			await fs.writeFile(filePath, buffer);

			uploadedImagePaths.push(relativeWebPath); // Store only the path string
		} catch (uploadError) {
			console.error("Error saving image locally:", uploadError);
			return { message: `Failed to save image ${file.name} on the server. Please try again.` };
		}
	}
	// --- End Image Upload to Local Filesystem ---

	// 4. Save complaint to the database using Prisma
	try {
		await prismaClient.complaint.create({
			data: {
				customerName: fullname,
				customerEmail: email,
				customerPhone: phoneNumber,
				customerAddress: address,
				buildingName: buildingName,
				area: branchArea, // Changed from 'branchArea' to 'area' to match schema
				description: description,
				imagePaths: uploadedImagePaths, // Assign the array of paths directly
			},
		});
	} catch (dbError) {
		console.error("Error saving complaint to DB:", dbError);
		return { message: "Failed to save complaint to the database. Please try again." };
	}

	// 5. Revalidate paths and redirect
	redirect("/success"); // Redirect to a success page or back to form
}
