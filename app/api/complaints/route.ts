// /app/api/complaints/route.ts (or /pages/api/complaints.ts)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prismaClient from "@/lib/prisma"; // Your Prisma client singleton
import path from "path"; // Import Node.js path module
import { nanoid } from "nanoid"; // For unique file names
import supabaseAdminClient from "@/lib/supabaseAdmin";

// IMPORTANT: Re-define your Zod schema on the server for validation!
// Match this with your client-side formSchema, but enforce server-side validation.
const serverFormSchema = z.object({
	fullname: z.string({ required_error: "Full name is required" }).min(2, { message: "Full name must be at least 2 characters long" }).max(50, { message: "Full name must be at most 50 characters long" }),
	email: z.string({ required_error: "Email is required" }).email({ message: "Enter a valid email address" }).or(z.literal("")),
	phoneNumber: z.string({ required_error: "Phone number is required" }).min(5, { message: "Phone number must be at least 5 characters long" }).max(15, { message: "Phone number must be at most 15 characters long" }),
	address: z.string({ required_error: "Address is required" }).min(5, { message: "Address must be at least 5 characters long" }).max(100, { message: "Address must be at most 100 characters long" }),
	buildingName: z.string({ required_error: "Building name is required" }).min(1, { message: "Building name must be at least 1 character long" }).max(20, { message: "Building name must be at most 20 characters long" }),
	apartmentNumber: z.string({ required_error: "Apartment Number is required" }).min(1, { message: "Minimum 1 character" }), // Optional field for apartment number
	convenientTime: z.enum(["EIGHT_AM_TO_TEN_AM", "TEN_AM_TO_TWELVE_PM", "TWELVE_PM_TO_TWO_PM", "TWO_PM_TO_FOUR_PM"], {
		required_error: "Convenient time is required",
	}),
	branchArea: z.string({ required_error: "Branch area is required" }).refine((val) => ["Al Nuaimia 1 - Ajman", "Al Jerf - Ajman", "Taawun - Sharjah", "Al Nahda - Sharjah", "Al Khan - Sharjah", "Al Majaz 1 - Sharjah", "Al Majaz 2 - Sharjah", "Abu Shagara - Sharjah", "Al Qasimia - Sharjah", "Muwaileh - Sharjah", "Industrial 15 - Sharjah", "Al Nahda - Dubai", "Al Qusais - Dubai", "Al Garhoud - Dubai", "Warsan - Dubai", "Silicon - Dubai", "Ras al Khor - Dubai", "Al Barsha - Dubai", "DIP - Dubai", "DIC - Dubai"].includes(val), {
		message: "Please select a valid branch area",
	}),
	description: z.string({ required_error: "Description is required" }).min(10, { message: "Description must be at least 10 characters long" }).max(500, { message: "Description must be at most 500 characters long" }),
});

export async function POST(req: NextRequest) {
	// 1. Extract data from the request body
	const formData = await req.formData(); // We use formData to extract file inputs
	const rawData = {
		fullname: formData.get("fullname"),
		email: formData.get("email"),
		phoneNumber: formData.get("phoneNumber"),
		address: formData.get("address"),
		convenientTime: formData.get("convenientTime"), // Ensure this matches your schema
		buildingName: formData.get("buildingName"),
		apartmentNumber: formData.get("apartmentNumber"), // Ensure this matches your schema
		branchArea: formData.get("branchArea"),
		description: formData.get("description"),
	};

	// 2. Server-side validation using Zod
	const validatedFields = serverFormSchema.safeParse(rawData);

	if (!validatedFields.success) {
		console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
		return NextResponse.json(
			{
				errors: validatedFields.error.flatten().fieldErrors,
				message: "Failed to submit complaint due to validation errors.",
			},
			{ status: 400 }
		);
	}

	const { fullname, email, phoneNumber, address, buildingName, apartmentNumber, convenientTime, branchArea, description } = validatedFields.data;

	// --- Start Image Upload to Supabase ---
	const files = formData.getAll("images") as File[]; // 'images' should match your input name

	const uploadedImagePaths: string[] = []; // This will now store only strings (paths)

	const maxSize = 2 * 1024 * 1024; // 2MB max size
	const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
	const maxImages = 5;

	if (files.length > maxImages) {
		return NextResponse.json({ message: `You can upload a maximum of ${maxImages} images.` }, { status: 400 });
	}

	// Define the base upload directory relative to your project root.
	// Use a slugified email for the directory name to be file-system safe

	const directoryName = email.replace(/[^a-zA-Z0-9_-]/g, "_"); // Basic slugify
	if (files.length > 0) {
		for (const file of files) {
			const uploadPath = path.join(directoryName, nanoid());
			// Skip empty file inputs if any (e.g. user selected nothing for an optional upload)
			if (file.size === 0 && file.name === "undefined") continue;

			if (!allowedTypes.includes(file.type) || file.size > maxSize) {
				console.warn(`Skipping invalid file: ${file.name}, type: ${file.type}, size: ${file.size}`);
				return NextResponse.json(
					{
						message: `Invalid file detected: ${file.name}. Max size is 2MB, supported types are ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}.`,
					},
					{ status: 400 }
				);
			}

			const { data, error } = await supabaseAdminClient.storage.from("complaint-images").upload(uploadPath, file);

			if (error) {
				console.error("Error uploading file to Supabase:", error);
				return NextResponse.json(
					{
						message: `Failed to upload image ${file.name} to Database. Please try again.`,
					},
					{ status: 500 }
				);
			} else {
				// Handle success
				uploadedImagePaths.push(data.path); // Store the path returned by Supabase
			}
		}
	}
	// --- End Image Upload to Supabase ---

	// 3. Save complaint to the database using Prisma
	try {
		await prismaClient.complaint.create({
			data: {
				customerName: fullname,
				customerEmail: email,
				customerPhone: phoneNumber,
				customerAddress: address,
				buildingName: buildingName,
				apartmentNumber: apartmentNumber,
				convenientTime: convenientTime,
				area: branchArea, // Changed from 'branchArea' to 'area' to match schema
				description: description,
				imagePaths: uploadedImagePaths, // Assign the array of paths directly
			},
		});
	} catch (dbError) {
		console.error("Error saving complaint to DB:", dbError);
		return NextResponse.json({ message: "Failed to save complaint to the database. Please try again." + dbError }, { status: 500 });
	}

	// 4. Redirect to a success page
	return NextResponse.json({ message: "Complaint submitted successfully!" }, { status: 200 });
}
