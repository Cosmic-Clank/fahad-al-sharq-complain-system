"use server";

import { z } from "zod";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";

async function requireAdmin() {
	const session = await auth();
	if (!session?.user?.id || (session.user as any).role !== "ADMIN") return null;
	return { id: Number(session.user.id), name: session.user.name ?? "Admin" };
}

function revalidateHandovers(userId: number) {
	revalidatePath(`/dashboard/admin/employees/${userId}/handovers`);
	revalidatePath("/dashboard/admin/hr/alerts");
	revalidatePath("/dashboard/employee/passport");
}

/** Admin creates a handover directly (pre-approved). */
export async function createHandover(formData: FormData) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can create handovers." };

	const parsed = z
		.object({
			userId: z.coerce.number().int().positive(),
			requestReason: z.string().max(500).optional().or(z.literal("")),
		})
		.safeParse({ userId: formData.get("userId"), requestReason: formData.get("requestReason") ?? "" });
	if (!parsed.success) return { success: false, message: "Validation error." };
	const d = parsed.data;

	const employee = await prismaClient.user.findUnique({
		where: { id: d.userId, role: { in: ["EMPLOYEE", "INVENTORY_MANAGER"] } },
		select: { fullName: true },
	});
	if (!employee) return { success: false, message: "Employee not found." };

	const open = await prismaClient.passportHandover.findFirst({
		where: { userId: d.userId, status: { in: ["REQUESTED", "APPROVED", "HANDED_OVER"] } },
	});
	if (open) return { success: false, message: "There is already an open handover for this employee." };

	try {
		const handover = await prismaClient.passportHandover.create({
			data: {
				userId: d.userId,
				status: "APPROVED",
				requestReason: d.requestReason || null,
				approvedAt: new Date(),
				handledByAdminName: admin.name,
			},
		});
		await logActivity({
			actorId: admin.id,
			targetUserId: d.userId,
			action: "HANDOVER_CREATE",
			entityType: "PassportHandover",
			entityId: handover.id,
			details: `${admin.name} started a passport handover for ${employee.fullName}`,
		});
		revalidateHandovers(d.userId);
		return { success: true, message: "Handover created and approved — collect signatures at handover." };
	} catch (error) {
		console.error("Error creating handover:", error);
		return { success: false, message: "Failed to create handover." };
	}
}

export async function setHandoverStatus(handoverId: number, status: "APPROVED" | "REJECTED") {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can update handovers." };

	try {
		const handover = await prismaClient.passportHandover.findUnique({
			where: { id: handoverId },
			include: { user: { select: { fullName: true } } },
		});
		if (!handover) return { success: false, message: "Handover not found." };
		if (handover.status !== "REQUESTED") return { success: false, message: "Only pending requests can be approved or rejected." };

		await prismaClient.passportHandover.update({
			where: { id: handoverId },
			data: {
				status,
				approvedAt: status === "APPROVED" ? new Date() : null,
				handledByAdminName: admin.name,
			},
		});

		await logActivity({
			actorId: admin.id,
			targetUserId: handover.userId,
			action: status === "APPROVED" ? "HANDOVER_APPROVE" : "HANDOVER_REJECT",
			entityType: "PassportHandover",
			entityId: handoverId,
			details: `${admin.name} ${status === "APPROVED" ? "approved" : "rejected"} the passport request of ${handover.user.fullName}`,
		});

		revalidateHandovers(handover.userId);
		return { success: true, message: status === "APPROVED" ? "Request approved — collect signatures at handover." : "Request rejected." };
	} catch (error) {
		console.error("Error updating handover:", error);
		return { success: false, message: "Failed to update handover." };
	}
}

const signSchema = z.object({
	handoverId: z.coerce.number().int().positive(),
	stage: z.enum(["HANDOVER", "RETURN"]),
	employeeSignature: z.string().startsWith("data:image/", "Employee signature is required"),
	adminSignature: z.string().startsWith("data:image/", "Admin signature is required"),
});

/** Record signatures: HANDOVER stage gives the passport out, RETURN stage takes it back. */
export async function signHandoverStage(formData: FormData) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can record handovers." };

	const parsed = signSchema.safeParse({
		handoverId: formData.get("handoverId"),
		stage: formData.get("stage"),
		employeeSignature: formData.get("employeeSignature"),
		adminSignature: formData.get("adminSignature"),
	});
	if (!parsed.success) return { success: false, message: `Validation error: ${parsed.error.errors.map((e) => e.message).join("; ")}` };
	const d = parsed.data;

	try {
		const handover = await prismaClient.passportHandover.findUnique({
			where: { id: d.handoverId },
			include: { user: { select: { fullName: true } } },
		});
		if (!handover) return { success: false, message: "Handover not found." };

		if (d.stage === "HANDOVER") {
			if (handover.status !== "APPROVED") return { success: false, message: "The request must be approved before handing over." };
			await prismaClient.passportHandover.update({
				where: { id: d.handoverId },
				data: {
					status: "HANDED_OVER",
					handedOverAt: new Date(),
					handledByAdminName: admin.name,
					employeeSignatureHandoverBase64: d.employeeSignature,
					adminSignatureHandoverBase64: d.adminSignature,
				},
			});
			await prismaClient.employeeProfile.upsert({
				where: { userId: handover.userId },
				create: { userId: handover.userId, passportHeldByCompany: false },
				update: { passportHeldByCompany: false },
			});
		} else {
			if (handover.status !== "HANDED_OVER") return { success: false, message: "The passport is not currently handed over." };
			await prismaClient.passportHandover.update({
				where: { id: d.handoverId },
				data: {
					status: "RETURNED",
					returnedAt: new Date(),
					employeeSignatureReturnBase64: d.employeeSignature,
					adminSignatureReturnBase64: d.adminSignature,
				},
			});
			await prismaClient.employeeProfile.upsert({
				where: { userId: handover.userId },
				create: { userId: handover.userId, passportHeldByCompany: true },
				update: { passportHeldByCompany: true },
			});
		}

		await logActivity({
			actorId: admin.id,
			targetUserId: handover.userId,
			action: d.stage === "HANDOVER" ? "HANDOVER_SIGNED_OUT" : "HANDOVER_SIGNED_RETURN",
			entityType: "PassportHandover",
			entityId: d.handoverId,
			details:
				d.stage === "HANDOVER"
					? `Passport of ${handover.user.fullName} handed over (signed by employee and ${admin.name})`
					: `Passport of ${handover.user.fullName} returned to company custody (signed by employee and ${admin.name})`,
		});

		revalidateHandovers(handover.userId);
		return { success: true, message: d.stage === "HANDOVER" ? "Passport handed over — both signatures recorded." : "Passport returned — both signatures recorded." };
	} catch (error) {
		console.error("Error signing handover:", error);
		return { success: false, message: "Failed to record signatures." };
	}
}
