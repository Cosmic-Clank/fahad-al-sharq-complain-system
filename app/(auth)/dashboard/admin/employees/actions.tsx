"use server";
import prismaClient from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteEmployees(employeeIds: string[]): Promise<{ success: boolean; message: string }> {
	try {
		if (!employeeIds || employeeIds.length === 0) {
			return { success: false, message: "No employee IDs provided for deletion." };
		}

		// Perform the deletion
		const deleteResult = await prismaClient.user.deleteMany({
			where: {
				id: {
					in: employeeIds.map((item) => Number(item)), // Delete all users whose IDs are in the provided array
				},
				role: "EMPLOYEE", // Optional: Add a check to only delete 'employee' roles
			},
		});

		if (deleteResult.count > 0) {
			revalidatePath("/dashboard/admin/employees"); // Revalidate the path where your table is displayed
			return { success: true, message: `${deleteResult.count} employee(s) deleted successfully.` };
		} else {
			return { success: false, message: "No employees found or deleted." };
		}
	} catch (error) {
		console.error("Error deleting employees:", error);
		// You might want to check for specific Prisma errors (e.g., P2025 for not found)
		return { success: false, message: "Failed to delete employees. An unexpected error occurred." };
	}
}
