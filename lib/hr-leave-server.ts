// Server-only leave helpers shared by the employee and admin leave actions.
import { revalidatePath } from "next/cache";
import prismaClient from "./prisma";
import { leaveDates } from "./hr-leave";
import { isValidSignature } from "./signature-server";

export { isValidSignature };

/** Pending or approved leave of this employee that shares a day with the range (optionally ignoring one request). */
export function findOverlappingLeave(userId: number, startDate: string, endDate: string, ignoreId?: number) {
	return prismaClient.leaveRequest.findFirst({
		where: {
			userId,
			status: { in: ["PENDING", "APPROVED"] },
			startDate: { lte: endDate },
			endDate: { gte: startDate },
			...(ignoreId ? { id: { not: ignoreId } } : {}),
		},
		select: { id: true },
	});
}

export function revalidateLeave(userId: number) {
	revalidatePath("/dashboard/employee/leave");
	revalidatePath(`/dashboard/admin/employees/${userId}/leave`);
	revalidatePath(`/dashboard/hr_manager/employees/${userId}/leave`);
	revalidatePath("/dashboard/admin/hr/leave");
	revalidatePath("/dashboard/hr_manager/leave");
	revalidatePath("/dashboard/admin/hr/attendance");
	revalidatePath("/dashboard/hr_manager/attendance");
	revalidatePath(`/dashboard/admin/employees/${userId}/attendance`);
	revalidatePath(`/dashboard/hr_manager/employees/${userId}/attendance`);
}

/** Leave requests serialized for LeaveSection (dates as display strings, signatures as booleans). */
export async function getLeaveRows(where: { userId?: number; status?: "PENDING" | { not: "PENDING" } }, take = 100) {
	const rows = await prismaClient.leaveRequest.findMany({
		where,
		orderBy: [{ startDate: "desc" }, { id: "desc" }],
		take,
		select: {
			id: true,
			userId: true,
			type: true,
			startDate: true,
			endDate: true,
			days: true,
			reason: true,
			status: true,
			signatureRequired: true,
			createdByAdminName: true,
			createdAt: true,
			decidedAt: true,
			decidedByName: true,
			decisionNote: true,
			user: { select: { fullName: true } },
		},
	});
	// Signatures are large base64 images — only fetch which rows have them
	const ids = rows.map((r) => r.id);
	const [empSigned, adminSigned] = await Promise.all([
		prismaClient.leaveRequest.findMany({ where: { id: { in: ids }, employeeSignatureBase64: { not: null } }, select: { id: true } }),
		prismaClient.leaveRequest.findMany({ where: { id: { in: ids }, adminSignatureBase64: { not: null } }, select: { id: true } }),
	]);
	const empSet = new Set(empSigned.map((r) => r.id));
	const adminSet = new Set(adminSigned.map((r) => r.id));
	const fmt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "short" });
	return rows.map((r) => ({
		id: r.id,
		userId: r.userId,
		employeeName: r.user.fullName,
		type: r.type,
		startDate: r.startDate,
		endDate: r.endDate,
		days: r.days,
		reason: r.reason,
		status: r.status,
		signatureRequired: r.signatureRequired,
		hasEmployeeSignature: empSet.has(r.id),
		hasAdminSignature: adminSet.has(r.id),
		createdByAdminName: r.createdByAdminName,
		requestedAt: fmt(r.createdAt),
		decidedAt: r.decidedAt ? fmt(r.decidedAt) : null,
		decidedByName: r.decidedByName,
		decisionNote: r.decisionNote,
	}));
}

/**
 * Approved leave days within a "YYYY-MM" month, keyed `${userId}|${date}` → leave type.
 * Used to mark leave on the attendance sheet, employee tab and exports.
 */
export async function getApprovedLeaveDays(month: string, userId?: number): Promise<Record<string, string>> {
	const monthStart = `${month}-01`;
	const monthEnd = `${month}-31`; // string compare: any real day of the month is <= "-31"
	const leaves = await prismaClient.leaveRequest.findMany({
		where: { status: "APPROVED", startDate: { lte: monthEnd }, endDate: { gte: monthStart }, ...(userId ? { userId } : {}) },
		select: { userId: true, type: true, startDate: true, endDate: true },
	});
	const days: Record<string, string> = {};
	for (const l of leaves) {
		for (const date of leaveDates(l.startDate, l.endDate)) {
			if (date.startsWith(month)) days[`${l.userId}|${date}`] = l.type;
		}
	}
	return days;
}
