// actions/complaint-actions.ts
"use server"; // This directive makes all exports in this file server functions

import { auth } from "@/auth";
import prismaClient from "@/lib/prisma"; // Your Prisma client instance
import { nanoid } from "nanoid"; // For unique file names

import path from "path";
import fs from "fs/promises";
import supabaseAdminClient from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

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

	const maxSize = 5 * 1024 * 1024; // 5MB (align with client-side validation)
	const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
	const maxImages = 5;

	if (files.length > maxImages) {
		return { success: false, message: `You can upload a maximum of ${maxImages} images.` };
	}
	const directoryName = nanoid(); // Folder per response to avoid collisions

	if (files.length > 0) {
		for (const file of files) {
			// Skip empty file inputs if any (e.g. user selected nothing for an optional upload)
			if (file.size === 0 && file.name === "undefined") continue;

			if (!allowedTypes.includes(file.type) || file.size > maxSize) {
				console.warn(`Skipping invalid file: ${file.name}, type: ${file.type}, size: ${file.size}`);
				return { success: false, message: `Invalid file detected: ${file.name}. Max size is 5MB, supported types are ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}.` };
			}

			// Ensure each file gets a unique path to avoid Supabase "resource exists" errors
			const extension = path.extname(file.name) || "";
			const uniqueFileName = `${nanoid()}${extension}`;
			const uploadPath = path.posix.join(directoryName, uniqueFileName);

			const { data, error } = await supabaseAdminClient.storage.from("complaint-images").upload(uploadPath, file, { upsert: false });
			if (error) {
				console.error("Error uploading file to Supabase:", error);
				return { success: false, message: `Failed to upload image ${file.name} to Database. Please try again.` };
				// Handle error
			} else {
				// Handle success
				uploadedImagePaths.push(data.path); // Store the path returned by Supabase
			}
		}
	}

	try {
		// 🚨 USER: Implement your database logic here 🚨
		// Example: Assuming you have a 'ComplaintResponse' model linked to 'Complaint'
		await prismaClient.complaintResponse.create({
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

	const complaintId = formData.get("complaintId") as string | null;
	const workerSignatureBase64 = formData.get("workerSignatureBase64") as string | null;
	const customerSignatureBase64 = formData.get("customerSignatureBase64") as string | null;

	if (!complaintId) {
		return { success: false, message: "Server error" };
	}

	// Check if signatures are provided (new system)
	if (workerSignatureBase64 && customerSignatureBase64) {
		if (!workerSignatureBase64.trim() || !customerSignatureBase64.trim()) {
			return { success: false, message: "Invalid signatures provided." };
		}

		try {
			const workTime = await prismaClient.workTimes.findFirst({
				where: {
					complaintId: Number(complaintId),
					endTime: null,
				},
				orderBy: { date: "desc" },
			});

			if (!workTime) {
				return { success: false, message: "No active work time found for this complaint." };
			}

			await prismaClient.workTimes.update({
				where: { id: workTime.id },
				data: {
					endTime: new Date(),
					workerSignatureBase64: workerSignatureBase64.trim(),
					customerSignatureBase64: customerSignatureBase64.trim(),
				},
			});

			return { success: true, message: "Work time ended successfully!" };
		} catch (error) {
			console.error("Error ending work time:", error);
			return { success: false, message: "Failed to end work time. Please try again." };
		}
	}

	// Fallback to old initials system for backward compatibility
	const workerInitialsRaw = formData.get("workerInitials") as string | null;
	const customerInitialsRaw = formData.get("customerInitials") as string | null;

	const normalize = (val: string | null) => (val ?? "").trim().toUpperCase();

	const workerInitials = normalize(workerInitialsRaw);
	const customerInitials = normalize(customerInitialsRaw);

	const initialsOk = (s: string) => /^[A-Z.\-\s]{1,6}$/.test(s);

	if (!workerInitials || !customerInitials || !initialsOk(workerInitials) || !initialsOk(customerInitials)) {
		return {
			success: false,
			message: "Please provide valid initials (1–6 characters; letters, spaces, dots, or dashes).",
		};
	}

	try {
		const workTime = await prismaClient.workTimes.findFirst({
			where: {
				complaintId: Number(complaintId),
				endTime: null,
			},
			orderBy: { date: "desc" },
		});

		if (!workTime) {
			return { success: false, message: "No active work time found for this complaint." };
		}

		await prismaClient.workTimes.update({
			where: { id: workTime.id },
			data: {
				endTime: new Date(),
				workerInitials,
				customerInitials,
			},
		});

		return { success: true, message: "Work time ended successfully!" };
	} catch (error) {
		console.error("Error ending work time:", error);
		return { success: false, message: "Failed to end work time. Please try again." };
	}
}

export async function fetchUsers() {
	return prismaClient.user.findMany();
}

export async function assignComplaintToUser(complaintId: number, userId: number) {
	const session = await auth();
	if (!session || !session.user || !session.user.id) {
		return { success: false, message: "Unauthorized. Please log in." };
	}

	try {
		const updatedComplaint = await prismaClient.complaint.update({
			where: { id: complaintId },
			data: { assignedToId: userId },
		});

		revalidatePath("/dashboard/complaints"); // Revalidate the complaints page to reflect the changes
		return { success: true, message: "Complaint assigned successfully!", complaint: updatedComplaint };
	} catch (error) {
		console.error("Error assigning complaint:", error);
		return { success: false, message: "Failed to assign complaint. Please try again." };
	}
}

export async function deleteComplaint(complaintId: number) {
	const session = await auth();
	if (!session || !session.user || !session.user.id) {
		return { success: false, message: "Unauthorized. Please log in." };
	}

	try {
		// Verify the complaint exists
		const complaint = await prismaClient.complaint.findUnique({
			where: { id: complaintId },
		});

		if (!complaint) {
			return { success: false, message: "Complaint not found." };
		}

		// Delete all related records first (workTimes, responses, etc.)
		await prismaClient.workTimes.deleteMany({
			where: { complaintId: complaintId },
		});

		await prismaClient.complaintResponse.deleteMany({
			where: { complaintId: complaintId },
		});

		// Finally delete the complaint
		await prismaClient.complaint.delete({
			where: { id: complaintId },
		});

		revalidatePath("/dashboard");
		return { success: true, message: "Complaint deleted successfully!" };
	} catch (error) {
		console.error("Error deleting complaint:", error);
		return { success: false, message: "Failed to delete complaint. Please try again." };
	}
}

export async function deleteComplaintResponse(responseId: string) {
	const session = await auth();
	if (!session || !session.user || !session.user.id) {
		return { success: false, message: "Unauthorized. Please log in." };
	}

	// Check if user is admin
	const user = await prismaClient.user.findUnique({
		where: { id: Number(session.user.id) },
	});

	if (!user || user.role !== "ADMIN") {
		return { success: false, message: "Only admins can delete responses." };
	}

	try {
		// Verify the response exists
		const response = await prismaClient.complaintResponse.findUnique({
			where: { id: Number(responseId) },
		});

		if (!response) {
			return { success: false, message: "Response not found." };
		}

		// Delete the response
		await prismaClient.complaintResponse.delete({
			where: { id: Number(responseId) },
		});

		revalidatePath("/dashboard");
		return { success: true, message: "Response deleted successfully!" };
	} catch (error) {
		console.error("Error deleting response:", error);
		return { success: false, message: "Failed to delete response. Please try again." };
	}
}

export async function editComplaintResponse(responseId: string, newResponseText: string) {
	const session = await auth();
	if (!session || !session.user || !session.user.id) {
		return { success: false, message: "Unauthorized. Please log in." };
	}

	// Check if user is admin
	const user = await prismaClient.user.findUnique({
		where: { id: Number(session.user.id) },
	});

	if (!user || user.role !== "ADMIN") {
		return { success: false, message: "Only admins can edit responses." };
	}

	if (!newResponseText || newResponseText.trim() === "") {
		return { success: false, message: "Response text cannot be empty." };
	}

	try {
		// Verify the response exists
		const response = await prismaClient.complaintResponse.findUnique({
			where: { id: Number(responseId) },
		});

		if (!response) {
			return { success: false, message: "Response not found." };
		}

		// Update the response
		await prismaClient.complaintResponse.update({
			where: { id: Number(responseId) },
			data: { response: newResponseText },
		});

		revalidatePath("/dashboard");
		return { success: true, message: "Response updated successfully!" };
	} catch (error) {
		console.error("Error updating response:", error);
		return { success: false, message: "Failed to update response. Please try again." };
	}
}

export async function updateEmployeeDetails(employeeId: number, fullName: string, username: string, password?: string) {
	const session = await auth();
	if (!session || !session.user || !session.user.id) {
		return { success: false, message: "Unauthorized. Please log in." };
	}

	// Check if user is admin
	const user = await prismaClient.user.findUnique({
		where: { id: Number(session.user.id) },
	});

	if (!user || user.role !== "ADMIN") {
		return { success: false, message: "Only admins can update employee details." };
	}

	// Validate input
	if (!fullName || fullName.trim() === "") {
		return { success: false, message: "Full name cannot be empty." };
	}

	if (!username || username.trim() === "") {
		return { success: false, message: "Username cannot be empty." };
	}

	try {
		// Verify the employee exists
		const employee = await prismaClient.user.findUnique({
			where: { id: employeeId, role: "EMPLOYEE" },
		});

		if (!employee) {
			return { success: false, message: "Employee not found." };
		}

		// Check if new username is already taken by another user
		if (username.trim() !== employee.username) {
			const existingUser = await prismaClient.user.findUnique({
				where: { username: username.trim() },
			});
			if (existingUser) {
				return { success: false, message: "Username is already taken." };
			}
		}

		// Update the employee
		const updateData: any = {
			fullName: fullName.trim(),
			username: username.trim(),
		};

		// Only update password if provided
		if (password && password.trim() !== "") {
			if (password.length < 6) {
				return { success: false, message: "Password must be at least 6 characters long." };
			}
			// Hash the password using bcrypt
			updateData.passwordHash = await bcrypt.hash(password.trim(), 12);
		}

		await prismaClient.user.update({
			where: { id: employeeId },
			data: updateData,
		});

		revalidatePath("/dashboard/admin/employees");
		return { success: true, message: "Employee details updated successfully!" };
	} catch (error) {
		console.error("Error updating employee details:", error);
		return { success: false, message: "Failed to update employee details. Please try again." };
	}
}
