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
		revalidatePath(`/admin/dashboard/complaint/${complaintId}`);

		return { success: true, message: "Response added successfully!" };
	} catch (error) {
		console.error("Error adding complaint response:", error);
		return { success: false, message: "Failed to add response. Please try again." };
	}
}

// You can add other server actions related to complaints here if needed
// export async function updateComplaintStatus(...) { ... }
