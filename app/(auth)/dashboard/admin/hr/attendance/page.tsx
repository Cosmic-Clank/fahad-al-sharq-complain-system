import React from "react";
import prismaClient from "@/lib/prisma";
import { CalendarCheck } from "lucide-react";
import AttendanceSheet, { type SheetRecords } from "./components/AttendanceSheet";
import DownloadPdfButton from "../components/DownloadPdfButton";
import { exportAttendanceSheetPdf } from "../hrReportActions";
import { currentMonthDubai } from "@/lib/hr-dates";

async function page({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
	const params = await searchParams;
	const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonthDubai();

	const [users, monthRecords] = await Promise.all([
		prismaClient.user.findMany({
			where: { role: { in: ["EMPLOYEE", "INVENTORY_MANAGER"] } },
			select: {
				id: true,
				fullName: true,
				employeeProfile: { select: { workStartTime: true } },
			},
			orderBy: { fullName: "asc" },
		}),
		prismaClient.attendanceRecord.findMany({
			where: { date: { startsWith: month } },
			select: {
				userId: true,
				date: true,
				status: true,
				statusOverridden: true,
				arriveTime: true,
				lunchOutTime: true,
				lunchInTime: true,
				leaveTime: true,
				earlyLeaveReason: true,
				earlyLeaveNote: true,
			},
		}),
	]);

	const employees = users.map((u) => ({
		id: u.id,
		fullName: u.fullName,
		workStartTime: u.employeeProfile?.workStartTime ?? "09:00",
		hasProfile: !!u.employeeProfile,
	}));

	const records: SheetRecords = {};
	for (const r of monthRecords) {
		records[`${r.userId}|${r.date}`] = {
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

	return (
		<div className='p-4 space-y-4'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<CalendarCheck className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>Attendance Sheet</h1>
				</div>
				<p className='text-gray-600 mt-1'>Record daily sign-ins for every employee. Status is computed from each employee&apos;s scheduled start time.</p>
			</div>

			<AttendanceSheet month={month} employees={employees} records={records}>
				<DownloadPdfButton getPdf={exportAttendanceSheetPdf.bind(null, month)} label='Export PDF' />
			</AttendanceSheet>
		</div>
	);
}

export default page;
