"use server";

import { z } from "zod";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { HR_STAFF_ROLES } from "@/lib/hr-roles";
import { todayYmdDubai } from "@/lib/hr-dates";
import { countLeaveDays, leaveSignatureRequired, LEAVE_TYPE_LABELS, validateLeaveRange } from "@/lib/hr-leave";
import { revalidateLeave, isValidSignature, findOverlappingLeave, withLeaveLock } from "@/lib/hr-leave-server";

const requestSchema = z.object({
	type: z.enum(["ANNUAL", "SICK", "EMERGENCY", "UNPAID"], { required_error: "Please choose the type of leave." }),
	startDate: z.string(),
	endDate: z.string(),
	reason: z.string().max(500).optional().or(z.literal("")),
	employeeSignature: z.string().optional().or(z.literal("")),
});

/** Employee requests leave for themselves. Signature rules are decided here, never by the browser. */
export async function requestLeave(formData: FormData) {
	const session = await auth();
	if (!session?.user?.id) return { success: false, message: "Please log in." };
	const userId = Number(session.user.id);

	const parsed = requestSchema.safeParse({
		type: formData.get("type") ?? undefined,
		startDate: formData.get("startDate") ?? "",
		endDate: formData.get("endDate") ?? "",
		reason: formData.get("reason") ?? "",
		employeeSignature: formData.get("employeeSignature") ?? "",
	});
	if (!parsed.success) return { success: false, message: parsed.error.errors[0].message };
	const d = parsed.data;

	const rangeError = validateLeaveRange(d.type, d.startDate, d.endDate, todayYmdDubai());
	if (rangeError) return { success: false, message: rangeError };

	const user = await prismaClient.user.findUnique({
		where: { id: userId },
		select: { fullName: true, role: true, employeeProfile: { select: { joiningDate: true } } },
	});
	if (!user || !HR_STAFF_ROLES.includes(user.role)) return { success: false, message: "Unauthorized. Please log in." };

	const signatureRequired = leaveSignatureRequired(user.employeeProfile?.joiningDate);
	const signature = isValidSignature(d.employeeSignature) ? d.employeeSignature : null;
	if (signatureRequired && !signature) return { success: false, message: "Please sign in the box before sending your request." };

	try {
		const days = countLeaveDays(d.startDate, d.endDate);
		// overlap check + create under one lock: a double submit can't create two requests
		const leave = await withLeaveLock(userId, async (tx) => {
			if (await findOverlappingLeave(userId, d.startDate, d.endDate, undefined, tx)) return null;
			return tx.leaveRequest.create({
				data: {
					userId,
					type: d.type,
					startDate: d.startDate,
					endDate: d.endDate,
					days,
					reason: d.reason?.trim() || null,
					signatureRequired,
					employeeSignatureBase64: signature,
				},
			});
		});
		if (!leave) return { success: false, message: "You already have leave on some of these days. Check your requests below." };
		await logActivity({
			actorId: userId,
			targetUserId: userId,
			action: "LEAVE_REQUEST",
			entityType: "LeaveRequest",
			entityId: leave.id,
			details: `${user.fullName} requested ${days} day(s) of ${LEAVE_TYPE_LABELS[d.type]} (${d.startDate} to ${d.endDate})${signature ? ", signed" : ""}`,
		});
		revalidateLeave(userId);
		return { success: true, message: "Leave request sent — the admin will review it." };
	} catch (error) {
		console.error("Error requesting leave:", error);
		return { success: false, message: "Failed to send the leave request. Please try again." };
	}
}

/** Employee withdraws their own request while it is still waiting for approval. */
export async function cancelMyLeave(leaveId: number) {
	const session = await auth();
	if (!session?.user?.id) return { success: false, message: "Please log in." };
	const userId = Number(session.user.id);
	if (!Number.isInteger(leaveId)) return { success: false, message: "Leave request not found." };

	const leave = await prismaClient.leaveRequest.findUnique({ where: { id: leaveId } });
	if (!leave || leave.userId !== userId) return { success: false, message: "Leave request not found." };
	if (leave.status !== "PENDING") return { success: false, message: "Only requests that are still waiting can be cancelled." };

	const cancelled = await withLeaveLock(userId, (tx) =>
		tx.leaveRequest.updateMany({ where: { id: leaveId, userId, status: "PENDING" }, data: { status: "CANCELLED", decidedAt: new Date() } })
	);
	if (cancelled.count !== 1) return { success: false, message: "Only requests that are still waiting can be cancelled." };
	await logActivity({
		actorId: userId,
		targetUserId: userId,
		action: "LEAVE_CANCEL",
		entityType: "LeaveRequest",
		entityId: leaveId,
		details: `${session.user.name ?? "Employee"} cancelled their leave request (${leave.startDate} to ${leave.endDate})`,
	});
	revalidateLeave(userId);
	return { success: true, message: "Leave request cancelled." };
}
