"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AttendanceDayDialog, { type AttendanceCellRecord } from "@/app/(auth)/dashboard/admin/hr/attendance/components/AttendanceDayDialog";
import { daysInMonth, shiftMonth, monthLabel, todayYmdDubai } from "@/lib/hr-dates";
import { ATTENDANCE_TEXT } from "@/lib/hr-attendance-labels";
import { useLanguage } from "@/hooks/use-language";

const STATUS_STYLES: Record<string, string> = {
	PRESENT: "bg-green-100 text-green-800",
	LATE: "bg-amber-100 text-amber-800",
	ABSENT: "bg-red-100 text-red-800",
};

export default function EmployeeAttendance({
	month,
	employee,
	records,
	leaveDays = {},
}: {
	month: string;
	employee: { id: number; fullName: string; workStartTime: string };
	records: Record<string, AttendanceCellRecord>;
	/** Approved leave in this month, keyed by date → leave type. */
	leaveDays?: Record<string, string>;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const t = ATTENDANCE_TEXT[useLanguage()];

	const today = todayYmdDubai();
	// Show days up to today for the current month, all days for past months
	const days = daysInMonth(month).filter((d) => d <= today);

	const openDay = (date: string) => {
		setSelectedDate(date);
		setDialogOpen(true);
	};

	const stats = Object.values(records).reduce(
		(acc, r) => {
			acc[r.status] = (acc[r.status] ?? 0) + 1;
			if (r.earlyLeaveReason === "OTHER") acc.otherLeaves += 1;
			return acc;
		},
		{ PRESENT: 0, LATE: 0, ABSENT: 0, otherLeaves: 0 } as Record<string, number>
	);
	const leaveCount = days.filter((d) => leaveDays[d] && !records[d]).length;

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between flex-wrap gap-3'>
				<div className='flex items-center gap-2'>
					<Button variant='outline' size='sm' asChild>
						<Link href={`?month=${shiftMonth(month, -1)}`}>
							<ChevronLeft className='w-4 h-4' />
						</Link>
					</Button>
					<span className='text-lg font-semibold min-w-40 text-center'>{monthLabel(month)}</span>
					<Button variant='outline' size='sm' asChild>
						<Link href={`?month=${shiftMonth(month, 1)}`}>
							<ChevronRight className='w-4 h-4' />
						</Link>
					</Button>
				</div>
				<div translate='no' className='notranslate flex gap-2 text-xs'>
					<span className='px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-semibold'>
						{t.status.PRESENT}: {stats.PRESENT}
					</span>
					<span className='px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold'>
						{t.status.LATE}: {stats.LATE}
					</span>
					<span className='px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-semibold'>
						{t.status.ABSENT}: {stats.ABSENT}
					</span>
					<span className='px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-semibold'>
						{t.otherLeaves}: {stats.otherLeaves}
					</span>
					<span className='px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-semibold'>
						{t.onLeave}: {leaveCount}
					</span>
				</div>
			</div>

			<div className='rounded-md border bg-white overflow-x-auto'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>In</TableHead>
							<TableHead>Lunch Out</TableHead>
							<TableHead>Lunch In</TableHead>
							<TableHead>Out</TableHead>
							<TableHead>Early Leave</TableHead>
							<TableHead></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{days
							.slice()
							.reverse()
							.map((date) => {
								const record = records[date] ?? null;
								return (
									<TableRow key={date} className={date === today ? "bg-primary/5" : ""}>
										<TableCell className='font-medium'>{date}</TableCell>
										<TableCell>
											{record ? (
												<span translate='no' className={`notranslate inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[record.status] ?? ""}`}>
													{t.status[record.status] ?? record.status}
												</span>
											) : leaveDays[date] ? (
												<span translate='no' className='notranslate inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800'>
													{t.onLeave} · {t.leaveType[leaveDays[date]] ?? leaveDays[date]}
												</span>
											) : (
												<span className='text-gray-300 text-xs'>—</span>
											)}
										</TableCell>
										<TableCell className='text-sm'>{record?.arriveTime ?? "—"}</TableCell>
										<TableCell className='text-sm'>{record?.lunchOutTime ?? "—"}</TableCell>
										<TableCell className='text-sm'>{record?.lunchInTime ?? "—"}</TableCell>
										<TableCell className='text-sm'>{record?.leaveTime ?? "—"}</TableCell>
										<TableCell className='text-sm'>
											{record?.earlyLeaveReason ? (
												<span translate='no' className='notranslate inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800' title={record.earlyLeaveNote ?? undefined}>
													{t.reason[record.earlyLeaveReason] ?? record.earlyLeaveReason}
												</span>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell>
											<Button variant='ghost' size='sm' onClick={() => openDay(date)}>
												{record ? "Edit" : "Record"}
											</Button>
										</TableCell>
									</TableRow>
								);
							})}
					</TableBody>
				</Table>
			</div>

			<AttendanceDayDialog open={dialogOpen} onOpenChange={setDialogOpen} employee={employee} date={selectedDate} record={selectedDate ? records[selectedDate] ?? null : null} />
		</div>
	);
}
