"use server";
import prismaClient from "@/lib/prisma";
import { HR_STAFF_ROLES } from "@/lib/hr-roles";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function deleteEmployees(employeeIds: string[]): Promise<{ success: boolean; message: string }> {
	try {
		const session = await auth();
		if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
			return { success: false, message: "Only admins can delete employees." };
		}
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
					role: { in: HR_STAFF_ROLES },
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
