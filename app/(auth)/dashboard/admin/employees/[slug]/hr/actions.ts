"use server";

import { z } from "zod";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";
import { round2 } from "@/lib/hr-payroll";

const profileSchema = z.object({
	userId: z.coerce.number().int().positive(),
	nationality: z.string().max(100).optional().or(z.literal("")),
	joiningDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional()
		.or(z.literal("")),
	basicSalary: z.coerce.number().min(0, "Basic salary cannot be negative"),
	allowances: z.coerce.number().min(0, "Allowances cannot be negative"),
	workStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Work start time must be HH:mm"),
	// preprocess: "" must become undefined (z.coerce.number turns "" into 0)
	leaveSalaryOverride: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().min(0).optional()),
	passportHeldByCompany: z.enum(["true", "false"]),
});

async function requireAdmin() {
	const session = await auth();
	if (!session?.user?.id || (session.user as any).role !== "ADMIN") return null;
	return { id: Number(session.user.id), name: session.user.name ?? "Admin" };
}

export async function upsertEmployeeProfile(formData: FormData) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can update HR profiles." };

	const parsed = profileSchema.safeParse({
		userId: formData.get("userId"),
		nationality: formData.get("nationality") ?? "",
		joiningDate: formData.get("joiningDate") ?? "",
		basicSalary: formData.get("basicSalary"),
		allowances: formData.get("allowances"),
		workStartTime: formData.get("workStartTime"),
		leaveSalaryOverride: formData.get("leaveSalaryOverride") ?? "",
		passportHeldByCompany: formData.get("passportHeldByCompany") ?? "true",
	});

	if (!parsed.success) {
		return { success: false, message: `Validation error: ${parsed.error.errors.map((e) => e.message).join("; ")}` };
	}

	const d = parsed.data;

	// Verify the target is an employee-type user
	const employee = await prismaClient.user.findUnique({
		where: { id: d.userId, role: { in: ["EMPLOYEE", "INVENTORY_MANAGER"] } },
		select: { id: true, fullName: true },
	});
	if (!employee) return { success: false, message: "Employee not found." };

	const data = {
		nationality: d.nationality || null,
		joiningDate: d.joiningDate ? new Date(`${d.joiningDate}T00:00:00Z`) : null,
		basicSalary: round2(d.basicSalary),
		allowances: round2(d.allowances),
		workStartTime: d.workStartTime,
		leaveSalaryOverride: d.leaveSalaryOverride === undefined ? null : round2(d.leaveSalaryOverride),
		passportHeldByCompany: d.passportHeldByCompany === "true",
	};

	try {
		await prismaClient.employeeProfile.upsert({
			where: { userId: d.userId },
			create: { userId: d.userId, ...data },
			update: data,
		});

		await logActivity({
			actorId: admin.id,
			targetUserId: d.userId,
			action: "HR_PROFILE_UPDATE",
			entityType: "EmployeeProfile",
			details: `${admin.name} updated HR profile of ${employee.fullName} (basic ${data.basicSalary}, allowances ${data.allowances}, start ${data.workStartTime})`,
		});

		revalidatePath(`/dashboard/admin/employees/${d.userId}/hr`);
		return { success: true, message: "HR profile saved." };
	} catch (error) {
		console.error("Error saving HR profile:", error);
		return { success: false, message: "Failed to save HR profile. Please try again." };
	}
}
