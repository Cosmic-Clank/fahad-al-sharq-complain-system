import React from "react";
import prismaClient from "@/lib/prisma";
import EmployeeAttendance from "./components/EmployeeAttendance";
import { currentMonthDubai } from "@/lib/hr-dates";
import { getApprovedLeaveDays } from "@/lib/hr-leave-server";
import type { AttendanceCellRecord } from "@/app/(auth)/dashboard/admin/hr/attendance/components/AttendanceDayDialog";

async function page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ month?: string }> }) {
	const slug = (await params).slug;
	const sp = await searchParams;
	const userId = Number(slug);
	const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonthDubai();

	const [user, monthRecords, leaveByKey] = await Promise.all([
		prismaClient.user.findUnique({
			where: { id: userId },
			select: { id: true, fullName: true, employeeProfile: { select: { workStartTime: true } } },
		}),
		prismaClient.attendanceRecord.findMany({
			where: { userId, date: { startsWith: month } },
		}),
		getApprovedLeaveDays(month, userId),
	]);
	// Keys are `${userId}|${date}` — this tab only needs the date
	const leaveDays = Object.fromEntries(Object.entries(leaveByKey).map(([key, type]) => [key.split("|")[1], type]));

	if (!user) return <div className='text-red-500 p-4'>Employee not found.</div>;

	const records: Record<string, AttendanceCellRecord> = {};
	for (const r of monthRecords) {
		records[r.date] = {
			status: r.status,
			statusOverridden: r.statusOverridden,
			arriveTime: r.arriveTime,
			lunchOutTime: r.lunchOutTime,
			lunchInTime: r.lunchInTime,
			leaveTime: r.leaveTime,
			earlyLeaveReason: r.earlyLeaveReason,
			earlyLeaveNote: r.earlyLeaveNote,
		};
	}

	return <EmployeeAttendance month={month} employee={{ id: user.id, fullName: user.fullName, workStartTime: user.employeeProfile?.workStartTime ?? "09:00" }} records={records} leaveDays={leaveDays} />;
}

export default page;
