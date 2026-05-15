"use server";
import prismaClient from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteEmployees(employeeIds: string[]): Promise<{ success: boolean; message: string }> {
	try {
		if (!employeeIds || employeeIds.length === 0) {
			return { success: false, message: "No employee IDs provided for deletion." };
		}

		const ids = employeeIds.map((item) => Number(item));

		// ComplaintResponse.responderId has no onDelete cascade, so delete those first
		const [, deleteResult] = await prismaClient.$transaction([
			prismaClient.complaintResponse.deleteMany({
				where: { responderId: { in: ids } },
			}),
			prismaClient.user.deleteMany({
				where: {
					id: { in: ids },
					role: { in: ["EMPLOYEE", "INVENTORY_MANAGER"] },
				},
			}),
		]);

		if (deleteResult.count > 0) {
			revalidatePath("/dashboard/admin/employees");
			return { success: true, message: `${deleteResult.count} employee(s) deleted successfully.` };
		} else {
			return { success: false, message: "No employees found or deleted." };
		}
	} catch (error) {
		console.error("Error deleting employees:", error);
		return { success: false, message: "Failed to delete employees. An unexpected error occurred." };
	}
}
