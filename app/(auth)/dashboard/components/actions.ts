// actions/complaint-actions.ts
"use server"; // This directive makes all exports in this file server functions

import { auth } from "@/auth";
import prismaClient from "@/lib/prisma"; // Your Prisma client instance
import { nanoid } from "nanoid"; // For unique file names

import path from "path";
import fs from "fs/promises";

// Define the type for the form data you expect
interface ResponseFormData {
	complaintId: string;
	responseText: string;
}

export async function addComplaintResponse(formData: FormData) {
	const session = await auth();
	if (!session || !session.user || !session.user.id) {
		return { success: false, message: "Unauthorized. Please log in." };
	}

	// Extract data from the FormData object
	const complaintId = formData.get("complaintId") as string;
	const responseText = formData.get("responseText") as string;

	// Basic validation (you might want more robust validation here, e.g., Zod)
	if (!complaintId || !responseText || responseText.trim() === "") {
		return { success: false, message: "Complaint ID and response text are required." };
	}

	const files = formData.getAll("images") as File[]; // 'images' should match your input name

	const uploadedImagePaths: string[] = []; // This will now store only strings (paths)

	const maxSize = 5 * 1024 * 1024; // 5MB
	const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
	const maxImages = 5;

	if (files.length > maxImages) {
		return { success: false, message: `You can upload a maximum of ${maxImages} images.` };
	}
	const directoryName = nanoid(); // Basic slugify
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

	try {
		// 🚨 USER: Implement your database logic here 🚨
		// Example: Assuming you have a 'ComplaintResponse' model linked to 'Complaint'
		const newResponse = await prismaClient.complaintResponse.create({
			data: {
				complaintId: Number(complaintId),
				response: responseText.trim(),
				responderId: Number(session.user.id), // Assuming you have a user ID in the session
				imagePaths: uploadedImagePaths, // Store the paths of uploaded images
				// Add fields for who responded (e.g., userId from auth context)
				// userId: 'your_user_id_here',
			},
		});

		// Revalidate the current page to show the new response immediately
		// Adjust the path to match your complaint detail page route

		return { success: true, message: "Response added successfully!" };
	} catch (error) {
		console.error("Error adding complaint response:", error);
		return { success: false, message: "Failed to add response. Please try again." };
	}
}

export async function addStartWorkTime(formData: FormData) {
	const session = await auth();
	if (!session || !session.user || !session.user.id) {
		return { success: false, message: "Unauthorized. Please log in." };
	}

	const complaintId = formData.get("complaintId") as string;

	if (!complaintId) {
		return { success: false, message: "Server error" };
	}

	try {
		const newWorkTime = await prismaClient.workTimes.create({
			data: {
				userId: Number(session.user.id), // Assuming you have a user ID in the session
				complaintId: Number(complaintId),
				date: new Date(),
				startTime: new Date(),
			},
		});

		return { success: true, message: "Work time added successfully!" };
	} catch (error) {
		console.error("Error adding work time:", error);
		return { success: false, message: "Failed to add work time. Please try again." };
	}
}

export async function addEndWorkTime(formData: FormData) {
	const session = await auth();
	if (!session || !session.user || !session.user.id) {
		return { success: false, message: "Unauthorized. Please log in." };
	}

	const complaintId = formData.get("complaintId") as string;

	if (!complaintId) {
		return { success: false, message: "Server error" };
	}

	try {
		const workTime = await prismaClient.workTimes.findFirst({
			where: {
				complaintId: Number(complaintId),
				endTime: null, // Find the work time that has not ended yet
			},
			orderBy: {
				date: "desc", // Get the most recent work time
			},
		});

		if (!workTime) {
			return { success: false, message: "No active work time found for this complaint." };
		}

		const updatedWorkTime = await prismaClient.workTimes.update({
			where: { id: workTime.id },
			data: {
				endTime: new Date(),
			},
		});

		return { success: true, message: "Work time ended successfully!" };
	} catch (error) {
		console.error("Error ending work time:", error);
		return { success: false, message: "Failed to end work time. Please try again." };
	}
}
