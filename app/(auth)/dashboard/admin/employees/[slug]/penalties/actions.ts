"use server";

import { z } from "zod";
import path from "path";
import { nanoid } from "nanoid";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import supabaseAdminClient from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";
import { round2 } from "@/lib/hr-payroll";

const SUPABASE_BASE_URL = "https://koxptzqfmeasndsaecyo.supabase.co";
const BUCKET = "employee-documents";

const penaltySchema = z.object({
	userId: z.coerce.number().int().positive(),
	type: z.enum(["SALARY_DEDUCTION", "LEAVE_SALARY_DEDUCTION", "TICKET_REMOVAL"]),
	// preprocess: "" must become undefined (z.coerce.number turns "" into 0)
	amount: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().min(0).optional()),
	details: z.string().max(500).optional().or(z.literal("")),
	note: z.string().max(1000).optional().or(z.literal("")),
	decidedBy: z.string().min(1, "The name of who decided this penalty is required").max(100),
	effectiveMonth: z.string().regex(/^\d{4}-\d{2}$/, "Effective month must be YYYY-MM"),
});

const bonusSchema = z.object({
	userId: z.coerce.number().int().positive(),
	amount: z.coerce.number().positive("Bonus amount must be greater than 0"),
	note: z.string().max(500).optional().or(z.literal("")),
	month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
});

async function requireAdmin() {
	const session = await auth();
	if (!session?.user?.id || (session.user as any).role !== "ADMIN") return null;
	return { id: Number(session.user.id), name: session.user.name ?? "Admin" };
}

export async function createPenalty(formData: FormData) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can add penalties." };

	const parsed = penaltySchema.safeParse({
		userId: formData.get("userId"),
		type: formData.get("type"),
		amount: formData.get("amount") ?? "",
		details: formData.get("details") ?? "",
		note: formData.get("note") ?? "",
		decidedBy: formData.get("decidedBy"),
		effectiveMonth: formData.get("effectiveMonth"),
	});
	if (!parsed.success) return { success: false, message: `Validation error: ${parsed.error.errors.map((e) => e.message).join("; ")}` };
	const d = parsed.data;

	if (d.type !== "TICKET_REMOVAL" && (d.amount === undefined || d.amount <= 0)) {
		return { success: false, message: "A positive amount is required for salary and leave-salary deductions." };
	}

	const employee = await prismaClient.user.findUnique({
		where: { id: d.userId, role: { in: ["EMPLOYEE", "INVENTORY_MANAGER"] } },
		select: { fullName: true },
	});
	if (!employee) return { success: false, message: "Employee not found." };

	// Optional joint-letter upload
	let letterFileUrl: string | null = null;
	const file = formData.get("letterFile") as File | null;
	if (file && file.size > 0) {
		const maxSize = 5 * 1024 * 1024;
		const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
		if (!allowedTypes.includes(file.type) || file.size > maxSize) {
			return { success: false, message: "Invalid letter file. Max size 5MB; JPEG, PNG or PDF." };
		}
		const extension = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
		const uploadPath = path.posix.join("penalty-letters", String(d.userId), `${nanoid()}${extension}`);
		const { data, error } = await supabaseAdminClient.storage.from(BUCKET).upload(uploadPath, file, { upsert: false });
		if (error) {
			console.error("Error uploading penalty letter:", error);
			return { success: false, message: "Failed to upload the letter file. Please try again." };
		}
		letterFileUrl = `${SUPABASE_BASE_URL}/storage/v1/object/public/${BUCKET}/${data.path}`;
	}

	try {
		const penalty = await prismaClient.penalty.create({
			data: {
				userId: d.userId,
				type: d.type,
				amount: d.amount === undefined ? null : round2(d.amount),
				details: d.details || null,
				note: d.note || null,
				decidedBy: d.decidedBy,
				effectiveMonth: d.effectiveMonth,
				isAutomatic: false,
				letterFileUrl,
			},
		});

		await logActivity({
			actorId: admin.id,
			targetUserId: d.userId,
			action: "PENALTY_CREATE",
			entityType: "Penalty",
			entityId: penalty.id,
			details: `${admin.name} recorded ${d.type} for ${employee.fullName} (decided by ${d.decidedBy}, month ${d.effectiveMonth}${penalty.amount ? `, ${penalty.amount} AED` : ""})`,
		});

		revalidatePath(`/dashboard/admin/employees/${d.userId}/penalties`);
		revalidatePath(`/dashboard/admin/employees/${d.userId}/payslips`);
		return { success: true, message: "Penalty recorded." };
	} catch (error) {
		console.error("Error creating penalty:", error);
		return { success: false, message: "Failed to record penalty. Please try again." };
	}
}

export async function deletePenalty(penaltyId: number) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can delete penalties." };

	try {
		const penalty = await prismaClient.penalty.findUnique({
			where: { id: penaltyId },
			include: { user: { select: { fullName: true } } },
		});
		if (!penalty) return { success: false, message: "Penalty not found." };
		if (penalty.isAutomatic) {
			return { success: false, message: "This deduction is automatic — change the attendance early-leave reason instead of deleting it." };
		}

		await prismaClient.penalty.delete({ where: { id: penaltyId } });

		await logActivity({
			actorId: admin.id,
			targetUserId: penalty.userId,
			action: "PENALTY_DELETE",
			entityType: "Penalty",
			entityId: penaltyId,
			details: `${admin.name} deleted ${penalty.type} of ${penalty.user.fullName} (month ${penalty.effectiveMonth})`,
		});

		revalidatePath(`/dashboard/admin/employees/${penalty.userId}/penalties`);
		revalidatePath(`/dashboard/admin/employees/${penalty.userId}/payslips`);
		return { success: true, message: "Penalty deleted." };
	} catch (error) {
		console.error("Error deleting penalty:", error);
		return { success: false, message: "Failed to delete penalty." };
	}
}

export async function createBonus(formData: FormData) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can add bonuses." };

	const parsed = bonusSchema.safeParse({
		userId: formData.get("userId"),
		amount: formData.get("amount"),
		note: formData.get("note") ?? "",
		month: formData.get("month"),
	});
	if (!parsed.success) return { success: false, message: `Validation error: ${parsed.error.errors.map((e) => e.message).join("; ")}` };
	const d = parsed.data;

	const employee = await prismaClient.user.findUnique({
		where: { id: d.userId, role: { in: ["EMPLOYEE", "INVENTORY_MANAGER"] } },
		select: { fullName: true },
	});
	if (!employee) return { success: false, message: "Employee not found." };

	try {
		const bonus = await prismaClient.bonus.create({
			data: { userId: d.userId, amount: round2(d.amount), note: d.note || null, month: d.month },
		});

		await logActivity({
			actorId: admin.id,
			targetUserId: d.userId,
			action: "BONUS_CREATE",
			entityType: "Bonus",
			entityId: bonus.id,
			details: `${admin.name} added a bonus of ${bonus.amount} AED for ${employee.fullName} (month ${d.month}${d.note ? `: ${d.note}` : ""})`,
		});

		revalidatePath(`/dashboard/admin/employees/${d.userId}/penalties`);
		revalidatePath(`/dashboard/admin/employees/${d.userId}/payslips`);
		return { success: true, message: "Bonus added — it will appear on that month's payslip." };
	} catch (error) {
		console.error("Error creating bonus:", error);
		return { success: false, message: "Failed to add bonus. Please try again." };
	}
}

export async function deleteBonus(bonusId: number) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can delete bonuses." };

	try {
		const bonus = await prismaClient.bonus.findUnique({
			where: { id: bonusId },
			include: { user: { select: { fullName: true } } },
		});
		if (!bonus) return { success: false, message: "Bonus not found." };

		await prismaClient.bonus.delete({ where: { id: bonusId } });

		await logActivity({
			actorId: admin.id,
			targetUserId: bonus.userId,
			action: "BONUS_DELETE",
			entityType: "Bonus",
			entityId: bonusId,
			details: `${admin.name} deleted a bonus of ${bonus.amount} AED of ${bonus.user.fullName} (month ${bonus.month})`,
		});

		revalidatePath(`/dashboard/admin/employees/${bonus.userId}/penalties`);
		revalidatePath(`/dashboard/admin/employees/${bonus.userId}/payslips`);
		return { success: true, message: "Bonus deleted." };
	} catch (error) {
		console.error("Error deleting bonus:", error);
		return { success: false, message: "Failed to delete bonus." };
	}
}
