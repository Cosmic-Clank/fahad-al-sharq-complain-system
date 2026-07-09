"use server";

import { z } from "zod";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";
import { compareHHmm } from "@/lib/hr-dates";
import { otherLateDeductionAmount } from "@/lib/hr-payroll";

const HHMM = /^\d{2}:\d{2}$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const attendanceSchema = z.object({
	userId: z.coerce.number().int().positive(),
	date: z.string().regex(YMD, "Invalid date"),
	statusMode: z.enum(["AUTO", "PRESENT", "ABSENT", "LATE"]),
	arriveTime: z.string().regex(HHMM).optional().or(z.literal("")),
	lunchOutTime: z.string().regex(HHMM).optional().or(z.literal("")),
	lunchInTime: z.string().regex(HHMM).optional().or(z.literal("")),
	leaveTime: z.string().regex(HHMM).optional().or(z.literal("")),
	earlyLeaveReason: z.enum(["NONE", "SICK", "ADDITIONAL_WORK", "OTHER"]),
	earlyLeaveNote: z.string().max(300).optional().or(z.literal("")),
});

async function requireAdmin() {
	const session = await auth();
	if (!session?.user?.id || (session.user as any).role !== "ADMIN") return null;
	return { id: Number(session.user.id), name: session.user.name ?? "Admin" };
}

/**
 * Keep automatic "3× Other early leave" deductions in sync for a user+month.
 * Every 3rd OTHER early leave in a calendar month creates a 2-day salary
 * deduction. Idempotent: penalties are keyed by a unique autoKey, and excess
 * automatic penalties are removed when records are edited back.
 */
async function syncOtherDeductions(userId: number, month: string, employeeName: string, adminId: number) {
	const count = await prismaClient.attendanceRecord.count({
		where: { userId, date: { startsWith: month }, earlyLeaveReason: "OTHER" },
	});
	const expected = Math.floor(count / 3);

	const profile = await prismaClient.employeeProfile.findUnique({ where: { userId } });
	const amount = otherLateDeductionAmount(profile?.basicSalary ?? 0);

	for (let n = 1; n <= expected; n++) {
		const autoKey = `OTHER3-${userId}-${month}-${n}`;
		const existing = await prismaClient.penalty.findUnique({ where: { autoKey } });
		if (!existing) {
			await prismaClient.penalty.create({
				data: {
					userId,
					type: "SALARY_DEDUCTION",
					amount,
					details: `Automatic: 3 'Other' early leaves in ${month} (2 days of basic salary)`,
					decidedBy: "System (automatic)",
					effectiveMonth: month,
					isAutomatic: true,
					autoKey,
				},
			});
			await logActivity({
				actorId: adminId,
				targetUserId: userId,
				action: "PENALTY_AUTO_CREATED",
				entityType: "Penalty",
				details: `Automatic 2-day deduction (${amount} AED) for ${employeeName}: 3 'Other' early leaves in ${month}`,
			});
		}
	}

	// Remove automatic penalties beyond the expected count (records were edited back)
	const autos = await prismaClient.penalty.findMany({
		where: { userId, isAutomatic: true, autoKey: { startsWith: `OTHER3-${userId}-${month}-` } },
	});
	for (const p of autos) {
		const n = Number(p.autoKey?.split("-").pop());
		if (Number.isFinite(n) && n > expected) {
			await prismaClient.penalty.delete({ where: { id: p.id } });
			await logActivity({
				actorId: adminId,
				targetUserId: userId,
				action: "PENALTY_AUTO_REMOVED",
				entityType: "Penalty",
				details: `Removed automatic deduction #${n} for ${employeeName} in ${month} (early-leave reasons were edited)`,
			});
		}
	}
}

export async function upsertAttendanceDay(formData: FormData) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can record attendance." };

	const parsed = attendanceSchema.safeParse({
		userId: formData.get("userId"),
		date: formData.get("date"),
		statusMode: formData.get("statusMode") ?? "AUTO",
		arriveTime: formData.get("arriveTime") ?? "",
		lunchOutTime: formData.get("lunchOutTime") ?? "",
		lunchInTime: formData.get("lunchInTime") ?? "",
		leaveTime: formData.get("leaveTime") ?? "",
		earlyLeaveReason: formData.get("earlyLeaveReason") ?? "NONE",
		earlyLeaveNote: formData.get("earlyLeaveNote") ?? "",
	});
	if (!parsed.success) {
		return { success: false, message: `Validation error: ${parsed.error.errors.map((e) => e.message).join("; ")}` };
	}
	const d = parsed.data;
	const month = d.date.slice(0, 7);

	const employee = await prismaClient.user.findUnique({
		where: { id: d.userId, role: { in: ["EMPLOYEE", "INVENTORY_MANAGER"] } },
		select: { id: true, fullName: true, employeeProfile: { select: { workStartTime: true } } },
	});
	if (!employee) return { success: false, message: "Employee not found." };

	// Compute status: manual choice wins, otherwise derive from arrival vs scheduled start
	const workStartTime = employee.employeeProfile?.workStartTime ?? "09:00";
	let status: "PRESENT" | "ABSENT" | "LATE";
	let statusOverridden = false;
	if (d.statusMode === "AUTO") {
		if (d.arriveTime) {
			status = compareHHmm(d.arriveTime, workStartTime) > 0 ? "LATE" : "PRESENT";
		} else {
			status = "ABSENT";
		}
	} else {
		status = d.statusMode;
		statusOverridden = true;
	}

	const data = {
		status,
		statusOverridden,
		arriveTime: d.arriveTime || null,
		lunchOutTime: d.lunchOutTime || null,
		lunchInTime: d.lunchInTime || null,
		leaveTime: d.leaveTime || null,
		earlyLeaveReason: d.earlyLeaveReason === "NONE" ? null : d.earlyLeaveReason,
		earlyLeaveNote: d.earlyLeaveReason === "NONE" ? null : d.earlyLeaveNote || null,
	};

	try {
		const record = await prismaClient.attendanceRecord.upsert({
			where: { userId_date: { userId: d.userId, date: d.date } },
			create: { userId: d.userId, date: d.date, ...data },
			update: data,
		});

		await logActivity({
			actorId: admin.id,
			targetUserId: d.userId,
			action: "ATTENDANCE_UPSERT",
			entityType: "AttendanceRecord",
			entityId: record.id,
			details: `${admin.name} recorded attendance for ${employee.fullName} on ${d.date}: ${status}${data.earlyLeaveReason ? ` (early leave: ${data.earlyLeaveReason})` : ""}`,
		});

		await syncOtherDeductions(d.userId, month, employee.fullName, admin.id);

		revalidatePath("/dashboard/admin/hr/attendance");
		revalidatePath(`/dashboard/admin/employees/${d.userId}/attendance`);
		revalidatePath(`/dashboard/admin/employees/${d.userId}/penalties`);
		return { success: true, message: `Attendance saved (${status.toLowerCase()}).` };
	} catch (error) {
		console.error("Error saving attendance:", error);
		return { success: false, message: "Failed to save attendance. Please try again." };
	}
}

export async function deleteAttendanceDay(userId: number, date: string) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can edit attendance." };
	if (!YMD.test(date)) return { success: false, message: "Invalid date." };

	try {
		const record = await prismaClient.attendanceRecord.findUnique({
			where: { userId_date: { userId, date } },
			include: { user: { select: { fullName: true } } },
		});
		if (!record) return { success: false, message: "No attendance entry for this day." };

		await prismaClient.attendanceRecord.delete({ where: { id: record.id } });

		await logActivity({
			actorId: admin.id,
			targetUserId: userId,
			action: "ATTENDANCE_DELETE",
			entityType: "AttendanceRecord",
			entityId: record.id,
			details: `${admin.name} removed attendance entry of ${record.user.fullName} on ${date}`,
		});

		await syncOtherDeductions(userId, date.slice(0, 7), record.user.fullName, admin.id);

		revalidatePath("/dashboard/admin/hr/attendance");
		revalidatePath(`/dashboard/admin/employees/${userId}/attendance`);
		revalidatePath(`/dashboard/admin/employees/${userId}/penalties`);
		return { success: true, message: "Attendance entry removed." };
	} catch (error) {
		console.error("Error deleting attendance:", error);
		return { success: false, message: "Failed to remove attendance entry." };
	}
}
