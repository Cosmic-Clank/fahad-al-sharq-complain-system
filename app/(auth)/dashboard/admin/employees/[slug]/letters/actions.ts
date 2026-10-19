"use server";

import { z } from "zod";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";
import { HR_STAFF_ROLES, canAccessHr } from "@/lib/hr-roles";
import { isValidSignature } from "@/lib/signature-server";
import { JOINT_LETTER_TYPE_LABELS, MAX_BODY, MAX_SUBJECT } from "@/lib/joint-letters";

async function requireHrAccess() {
	const session = await auth();
	if (!session?.user?.id || !canAccessHr((session.user as any).role)) return null;
	return { id: Number(session.user.id), name: session.user.name ?? "Admin" };
}

function revalidateLetters(userId: number) {
	for (const base of ["/dashboard/admin/employees", "/dashboard/hr_manager/employees"]) {
		revalidatePath(`${base}/${userId}/letters`);
		revalidatePath(`${base}/${userId}/penalties`);
		revalidatePath(`${base}/${userId}/activity`);
	}
}

const createSchema = z.object({
	userId: z.coerce.number().int().positive(),
	type: z.enum(["WARNING", "PENALTY", "NOTICE"], { required_error: "Please choose the type of letter." }),
	subject: z.string().trim().min(3, "Please enter a subject.").max(MAX_SUBJECT),
	body: z.string().trim().min(20, "Please write the letter text.").max(MAX_BODY),
	letterDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose the letter date."),
	penaltyId: z.string().optional().or(z.literal("")),
	employeeSignature: z.string().optional().or(z.literal("")),
	adminSignature: z.string().optional().or(z.literal("")),
});

/** Create a joint letter, optionally signed right away (both signatures or neither). */
export async function createJointLetter(formData: FormData) {
	const admin = await requireHrAccess();
	if (!admin) return { success: false, message: "Only admins can create joint letters." };

	const parsed = createSchema.safeParse({
		userId: formData.get("userId"),
		type: formData.get("type") ?? undefined,
		subject: formData.get("subject") ?? "",
		body: formData.get("body") ?? "",
		letterDate: formData.get("letterDate") ?? "",
		penaltyId: formData.get("penaltyId") ?? "",
		employeeSignature: formData.get("employeeSignature") ?? "",
		adminSignature: formData.get("adminSignature") ?? "",
	});
	if (!parsed.success) return { success: false, message: parsed.error.errors[0].message };
	const d = parsed.data;

	const employee = await prismaClient.user.findUnique({ where: { id: d.userId, role: { in: HR_STAFF_ROLES } }, select: { fullName: true } });
	if (!employee) return { success: false, message: "Employee not found." };

	// A linked penalty must belong to the same employee
	let penaltyId: number | null = null;
	if (d.penaltyId) {
		const penalty = await prismaClient.penalty.findFirst({ where: { id: Number(d.penaltyId), userId: d.userId }, select: { id: true } });
		if (!penalty) return { success: false, message: "Penalty not found." };
		penaltyId = penalty.id;
	}

	const hasEmp = !!d.employeeSignature;
	const hasAdmin = !!d.adminSignature;
	if (hasEmp !== hasAdmin) return { success: false, message: "Both signatures are needed to sign the letter — or leave both empty to sign later." };
	const signed = hasEmp && hasAdmin;
	if (signed && (!isValidSignature(d.employeeSignature) || !isValidSignature(d.adminSignature))) {
		return { success: false, message: "Invalid signatures provided." };
	}

	try {
		const letter = await prismaClient.jointLetter.create({
			data: {
				userId: d.userId,
				type: d.type,
				subject: d.subject,
				body: d.body,
				letterDate: d.letterDate,
				penaltyId,
				createdByName: admin.name,
				employeeSignatureBase64: signed ? d.employeeSignature : null,
				adminSignatureBase64: signed ? d.adminSignature : null,
				signedAt: signed ? new Date() : null,
				signedByAdminName: signed ? admin.name : null,
			},
		});
		await logActivity({
			actorId: admin.id,
			targetUserId: d.userId,
			action: "JOINT_LETTER_CREATE",
			entityType: "JointLetter",
			entityId: letter.id,
			details: `${admin.name} created a ${JOINT_LETTER_TYPE_LABELS[d.type]} for ${employee.fullName}: "${d.subject}"${signed ? " (signed by both)" : ""}`,
		});
		revalidateLetters(d.userId);
		return { success: true, message: signed ? "Joint letter created and signed." : "Joint letter saved — sign it when the employee is present." };
	} catch (error) {
		console.error("Error creating joint letter:", error);
		return { success: false, message: "Failed to create the joint letter. Please try again." };
	}
}

const signSchema = z.object({
	letterId: z.coerce.number().int().positive(),
	employeeSignature: z.string(),
	adminSignature: z.string(),
});

/** Sign a saved letter later — employee and admin together. */
export async function signJointLetter(formData: FormData) {
	const admin = await requireHrAccess();
	if (!admin) return { success: false, message: "Only admins can create joint letters." };

	const parsed = signSchema.safeParse({ letterId: formData.get("letterId"), employeeSignature: formData.get("employeeSignature") ?? "", adminSignature: formData.get("adminSignature") ?? "" });
	if (!parsed.success || !isValidSignature(parsed.data.employeeSignature) || !isValidSignature(parsed.data.adminSignature)) {
		return { success: false, message: "Both signatures are required." };
	}
	const d = parsed.data;

	const letter = await prismaClient.jointLetter.findUnique({ where: { id: d.letterId }, include: { user: { select: { fullName: true } } } });
	if (!letter) return { success: false, message: "Joint letter not found." };
	if (letter.signedAt) return { success: false, message: "This letter is already signed." };

	try {
		await prismaClient.jointLetter.update({
			where: { id: d.letterId },
			data: { employeeSignatureBase64: d.employeeSignature, adminSignatureBase64: d.adminSignature, signedAt: new Date(), signedByAdminName: admin.name },
		});
		await logActivity({
			actorId: admin.id,
			targetUserId: letter.userId,
			action: "JOINT_LETTER_SIGN",
			entityType: "JointLetter",
			entityId: letter.id,
			details: `Joint letter "${letter.subject}" signed by ${letter.user.fullName} and ${admin.name}`,
		});
		revalidateLetters(letter.userId);
		return { success: true, message: "Joint letter signed." };
	} catch (error) {
		console.error("Error signing joint letter:", error);
		return { success: false, message: "Failed to record signatures." };
	}
}

/** Unsigned letters can be deleted; signed ones are kept as a permanent record. */
export async function deleteJointLetter(letterId: number) {
	const admin = await requireHrAccess();
	if (!admin) return { success: false, message: "Only admins can create joint letters." };

	const letter = await prismaClient.jointLetter.findUnique({ where: { id: letterId }, include: { user: { select: { fullName: true } } } });
	if (!letter) return { success: false, message: "Joint letter not found." };
	if (letter.signedAt) return { success: false, message: "Signed letters cannot be deleted." };

	await prismaClient.jointLetter.delete({ where: { id: letterId } });
	await logActivity({
		actorId: admin.id,
		targetUserId: letter.userId,
		action: "JOINT_LETTER_DELETE",
		entityType: "JointLetter",
		entityId: letterId,
		details: `${admin.name} deleted the unsigned joint letter "${letter.subject}" for ${letter.user.fullName}`,
	});
	revalidateLetters(letter.userId);
	return { success: true, message: "Joint letter deleted." };
}
