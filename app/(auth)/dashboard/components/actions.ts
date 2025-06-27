// actions/complaint-actions.ts
"use server"; // This directive makes all exports in this file server functions

import { auth } from "@/auth";
import prismaClient from "@/lib/prisma"; // Your Prisma client instance
import { revalidatePath } from "next/cache"; // To revalidate the data after submission

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

	try {
		// 🚨 USER: Implement your database logic here 🚨
		// Example: Assuming you have a 'ComplaintResponse' model linked to 'Complaint'
		const newResponse = await prismaClient.complaintResponse.create({
			data: {
				complaintId: Number(complaintId),
				response: responseText.trim(),
				responderId: Number(session.user.id), // Assuming you have a user ID in the session
				// Add fields for who responded (e.g., userId from auth context)
				// userId: 'your_user_id_here',
			},
		});

		console.log("Complaint response added:", newResponse);

		// Revalidate the current page to show the new response immediately
		// Adjust the path to match your complaint detail page route

		return { success: true, message: "Response added successfully!" };
	} catch (error) {
		console.error("Error adding complaint response:", error);
		return { success: false, message: "Failed to add response. Please try again." };
	}
}

type ActionResponse = {
	success: boolean;
	message: string;
	responseId?: string;
	startedAt?: string; // ISO string for Date
	completedAt?: string; // ISO string for Date
	error?: string; // Detailed error message for development/debugging
};

// --- Server Action: startComplaintResponse ---
/**
 * Starts a new response session for a complaint or identifies an existing in-progress one for the current user.
 * It sets the `startedAt` timestamp on the response record.
 * @param complaintId The ID of the complaint to start work on.
 * @returns An object indicating success/failure, message, and the ID of the started response.
 */
export async function startComplaintResponse(complaintId: string): Promise<ActionResponse> {
	const session = await auth(); // Get the current user session
	if (!session || !session.user || !session.user.id) {
		return { success: false, message: "Unauthorized. Please log in.", error: "User not authenticated." };
	}

	const employeeId = session.user.id; // Get the employeeId securely from the session

	try {
		// First, check if this specific employee already has an active (started but not completed)
		// response session for this complaint. This prevents multiple 'start' entries for the same work in progress.
		const existingInProgressResponse = await prismaClient.complaintResponse.findFirst({
			// <--- CORRECTED MODEL NAME
			where: {
				complaintId: Number(complaintId),
				responderId: Number(employeeId),
				startedAt: { not: null },
				completedAt: null, // Looking for responses that are started but not yet completed
			},
		});

		if (existingInProgressResponse) {
			console.log(`Work already in progress for complaint ${complaintId} by ${employeeId}. Returning existing session.`);
			return {
				success: true,
				message: "Work session already in progress.",
				responseId: existingInProgressResponse.id.toString(),
				startedAt: existingInProgressResponse.startedAt?.toISOString(),
			};
		}

		// If no existing in-progress response for this employee and complaint, create a new one
		const newResponse = await prismaClient.complaintResponse.create({
			// <--- CORRECTED MODEL NAME
			data: {
				complaintId: Number(complaintId),
				startedAt: new Date(), // Set the started timestamp
				response: "", // Initialize with an empty response text
				responderId: Number(employeeId), // Set the foreign key directly
				// Add any other default fields needed for a new response (e.g., a default status)
			},
		});

		// Revalidate paths to refresh data on affected pages in the UI

		return {
			success: true,
			message: "Work session started successfully.",
			responseId: newResponse.id.toString(),
			startedAt: newResponse.startedAt?.toISOString(),
		};
	} catch (error) {
		console.error("Error starting complaint response:", error);
		return { success: false, error: (error as Error).message || "Database error.", message: "Failed to start work session." };
	}
}

// --- Server Action: completeComplaintResponse ---
/**
 * Completes an existing response session by setting its `completedAt` timestamp.
 * It also verifies that the current user is the one who started this response.
 * @param responseId The ID of the response session to complete.
 * @returns An object indicating success/failure and message.
 */
export async function completeComplaintResponse(responseId: string): Promise<ActionResponse> {
	const session = await auth(); // Get the current user session
	if (!session || !session.user || !session.user.id) {
		return { success: false, message: "Unauthorized. Please log in.", error: "User not authenticated." };
	}

	const employeeId = session.user.id;

	try {
		// Find and update the specific response. Ensure it was started by this user and isn't already completed.
		const updatedResponse = await prismaClient.complaintResponse.updateMany({
			// <--- CORRECTED MODEL NAME
			where: {
				id: Number(responseId),
				responderId: Number(employeeId), // Ensure only the actual responder can complete their session
				startedAt: { not: null },
				completedAt: null, // Ensure we are only completing an active, not-yet-completed session
			},
			data: {
				completedAt: new Date(), // Set the completed timestamp
				// You might also want to set a 'status' field on the response here, e.g., 'Completed'
			},
		});

		if (updatedResponse.count === 0) {
			// This means the response was not found, or it didn't match the responderId,
			// or it was already completed.
			const responseCheck = await prismaClient.complaintResponse.findUnique({ where: { id: Number(responseId) } }); // <--- CORRECTED MODEL NAME
			if (!responseCheck) {
				return { success: false, message: "Work session not found.", error: "Response ID not found." };
			}
			if (responseCheck.responderId !== Number(employeeId)) {
				return { success: false, message: "Not authorized to complete this session.", error: "Responder mismatch." };
			}
			if (responseCheck.completedAt) {
				return { success: false, message: "Work session already completed.", error: "Already completed." };
			}
			return { success: false, message: "Could not complete work session. (Unknown issue)", error: "UpdateMany count 0." };
		}

		// Fetch the updated response to return its details
		const responseDetails = await prismaClient.complaintResponse.findUnique({
			// <--- CORRECTED MODEL NAME
			where: { id: Number(responseId) },
			select: { complaintId: true, startedAt: true, completedAt: true },
		});

		if (!responseDetails) {
			return { success: false, message: "Completed work, but could not retrieve details.", error: "Response details not found after update." };
		}

		// Revalidate paths to refresh data in the UI

		return {
			success: true,
			message: "Work session completed successfully!",
			completedAt: responseDetails.completedAt?.toISOString(),
			startedAt: responseDetails.startedAt?.toISOString(),
		};
	} catch (error) {
		console.error("Error completing complaint response:", error);
		return { success: false, error: (error as Error).message || "Database error.", message: "Failed to complete work session." };
	}
}
