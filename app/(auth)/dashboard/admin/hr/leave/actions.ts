"use server";

import { z } from "zod";
import prismaClient from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { HR_STAFF_ROLES } from "@/lib/hr-roles";
import { countLeaveDays, leaveSignatureRequired, LEAVE_TYPE_LABELS, MAX_LEAVE_DAYS } from "@/lib/hr-leave";
import { findOverlappingLeave, withLeaveLock, revalidateLeave, isValidSignature } from "@/lib/hr-leave-server";
import { requireHrAccess } from "@/lib/authz";

const signatureOrEmpty = z.string().optional().or(z.literal(""));
const validSignature = (s: string | undefined) => (isValidSignature(s) ? s : null);

const decideSchema = z.object({
	leaveId: z.coerce.number().int().positive(),
	decision: z.enum(["APPROVED", "REJECTED"]),
	adminSignature: signatureOrEmpty,
	note: z.string().max(500).optional().or(z.literal("")),
});

/** Approve or reject a pending request. Approving a signature-required request needs the admin's signature. */
export async function decideLeave(formData: FormData) {
	const admin = await requireHrAccess();
	if (!admin) return { success: false, message: "Only admins can approve leave." };

	const parsed = decideSchema.safeParse({
		leaveId: formData.get("leaveId"),
		decision: formData.get("decision"),
		adminSignature: formData.get("adminSignature") ?? "",
		note: formData.get("note") ?? "",
	});
	if (!parsed.success) return { success: false, message: "Validation error." };
	const d = parsed.data;

	const leave = await prismaClient.leaveRequest.findUnique({ where: { id: d.leaveId }, include: { user: { select: { fullName: true } } } });
	if (!leave) return { success: false, message: "Leave request not found." };
	if (leave.status !== "PENDING") return { success: false, message: "Only requests that are still waiting can be approved or rejected." };

	const adminSignature = validSignature(d.adminSignature);
	if (d.decision === "APPROVED") {
		if (leave.signatureRequired && !adminSignature) return { success: false, message: "Your signature is required to approve this leave." };
	}

	try {
		const outcome = await withLeaveLock(leave.userId, async (tx) => {
			if (d.decision === "APPROVED" && (await findOverlappingLeave(leave.userId, leave.startDate, leave.endDate, leave.id, tx))) return "overlap";
			// Conditional on PENDING: a request cancelled or decided a moment ago is left alone
			const updated = await tx.leaveRequest.updateMany({
				where: { id: d.leaveId, status: "PENDING" },
				data: {
					status: d.decision,
					decidedAt: new Date(),
					decidedByName: admin.name,
					decisionNote: d.note?.trim() || null,
					adminSignatureBase64: d.decision === "APPROVED" ? adminSignature : null,
				},
			});
			return updated.count === 1 ? "ok" : "stale";
		});
		if (outcome === "overlap") return { success: false, message: "This employee already has leave on some of these days." };
		if (outcome === "stale") return { success: false, message: "Only requests that are still waiting can be approved or rejected." };
		await logActivity({
			actorId: admin.id,
			targetUserId: leave.userId,
			action: d.decision === "APPROVED" ? "LEAVE_APPROVE" : "LEAVE_REJECT",
			entityType: "LeaveRequest",
			entityId: leave.id,
			details: `${admin.name} ${d.decision === "APPROVED" ? "approved" : "rejected"} ${leave.days} day(s) of ${LEAVE_TYPE_LABELS[leave.type]} for ${leave.user.fullName} (${leave.startDate} to ${leave.endDate})`,
		});
		revalidateLeave(leave.userId);
		return { success: true, message: d.decision === "APPROVED" ? "Leave approved." : "Leave rejected." };
	} catch (error) {
		console.error("Error deciding leave:", error);
		return { success: false, message: "Failed to update the leave request." };
	}
}

const recordSchema = z.object({
	userId: z.coerce.number().int().positive(),
	type: z.enum(["ANNUAL", "SICK", "EMERGENCY", "UNPAID"], { required_error: "Please choose the type of leave." }),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose both a start and an end date."),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose both a start and an end date."),
	reason: z.string().max(500).optional().or(z.literal("")),
	employeeSignature: signatureOrEmpty,
	adminSignature: signatureOrEmpty,
});

/**
 * HR records leave on the employee's behalf (for staff who don't use the app).
 * It is approved immediately; past dates are allowed since HR may record after the fact.
 */
export async function recordLeave(formData: FormData) {
	const admin = await requireHrAccess();
	if (!admin) return { success: false, message: "Only admins can approve leave." };

	const parsed = recordSchema.safeParse({
		userId: formData.get("userId"),
		type: formData.get("type") ?? undefined,
		startDate: formData.get("startDate") ?? "",
		endDate: formData.get("endDate") ?? "",
		reason: formData.get("reason") ?? "",
		employeeSignature: formData.get("employeeSignature") ?? "",
		adminSignature: formData.get("adminSignature") ?? "",
	});
	if (!parsed.success) return { success: false, message: parsed.error.errors[0].message };
	const d = parsed.data;

	if (d.endDate < d.startDate) return { success: false, message: "The end date must be on or after the start date." };
	const days = countLeaveDays(d.startDate, d.endDate);
	if (days > MAX_LEAVE_DAYS) return { success: false, message: `A single leave request can be at most ${MAX_LEAVE_DAYS} days.` };

	const employee = await prismaClient.user.findUnique({
		where: { id: d.userId, role: { in: HR_STAFF_ROLES } },
		select: { fullName: true, employeeProfile: { select: { joiningDate: true } } },
	});
	if (!employee) return { success: false, message: "Employee not found." };

	const signatureRequired = leaveSignatureRequired(employee.employeeProfile?.joiningDate);
	const employeeSignature = validSignature(d.employeeSignature);
	const adminSignature = validSignature(d.adminSignature);
	if (signatureRequired && (!employeeSignature || !adminSignature)) {
		return { success: false, message: "Both signatures are required (2+ years of service or no joining date set)." };
	}

	try {
		const leave = await withLeaveLock(d.userId, async (tx) => {
			if (await findOverlappingLeave(d.userId, d.startDate, d.endDate, undefined, tx)) return null;
			return tx.leaveRequest.create({
				data: {
					userId: d.userId,
					type: d.type,
					startDate: d.startDate,
					endDate: d.endDate,
					days,
					reason: d.reason?.trim() || null,
					status: "APPROVED",
					signatureRequired,
					employeeSignatureBase64: employeeSignature,
					adminSignatureBase64: adminSignature,
					createdByAdminName: admin.name,
					decidedAt: new Date(),
					decidedByName: admin.name,
				},
			});
		});
		if (!leave) return { success: false, message: "This employee already has leave on some of these days." };
		await logActivity({
			actorId: admin.id,
			targetUserId: d.userId,
			action: "LEAVE_RECORD",
			entityType: "LeaveRequest",
			entityId: leave.id,
			details: `${admin.name} recorded ${days} day(s) of ${LEAVE_TYPE_LABELS[d.type]} for ${employee.fullName} (${d.startDate} to ${d.endDate})`,
		});
		revalidateLeave(d.userId);
		return { success: true, message: "Leave recorded and approved." };
	} catch (error) {
		console.error("Error recording leave:", error);
		return { success: false, message: "Failed to record the leave. Please try again." };
	}
}
