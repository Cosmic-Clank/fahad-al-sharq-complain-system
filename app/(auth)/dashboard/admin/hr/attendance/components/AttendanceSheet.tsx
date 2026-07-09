"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AttendanceDayDialog, { type AttendanceCellRecord } from "./AttendanceDayDialog";
import { daysInMonth, shiftMonth, monthLabel, todayYmdDubai } from "@/lib/hr-dates";

export interface SheetEmployee {
	id: number;
	fullName: string;
	workStartTime: string;
	hasProfile: boolean;
}

export type SheetRecords = Record<string, AttendanceCellRecord>; // key: `${userId}|${date}`

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
	PRESENT: { label: "P", className: "bg-green-100 text-green-800" },
	LATE: { label: "L", className: "bg-amber-100 text-amber-800" },
	ABSENT: { label: "A", className: "bg-red-100 text-red-800" },
};

export default function AttendanceSheet({ month, employees, records, children }: { month: string; employees: SheetEmployee[]; records: SheetRecords; children?: React.ReactNode }) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selected, setSelected] = useState<{ employee: SheetEmployee; date: string } | null>(null);

	const days = daysInMonth(month);
	const today = todayYmdDubai();
	const profileless = employees.filter((e) => !e.hasProfile);

	const openCell = (employee: SheetEmployee, date: string) => {
		setSelected({ employee, date });
		setDialogOpen(true);
	};

	const isWeekend = (date: string) => {
		const day = new Date(`${date}T00:00:00`).getDay();
		return day === 0 || day === 6; // Sun / Sat
	};

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
				<div className='flex items-center gap-3'>
					<div className='flex items-center gap-2 text-xs text-gray-600'>
						<span className='inline-flex w-5 h-5 items-center justify-center rounded bg-green-100 text-green-800 font-bold'>P</span> Present
						<span className='inline-flex w-5 h-5 items-center justify-center rounded bg-amber-100 text-amber-800 font-bold'>L</span> Late
						<span className='inline-flex w-5 h-5 items-center justify-center rounded bg-red-100 text-red-800 font-bold'>A</span> Absent
					</div>
					{children}
				</div>
			</div>

			{profileless.length > 0 && (
				<div className='flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3'>
					<AlertTriangle className='w-4 h-4 mt-0.5 shrink-0' />
					<span>
						No HR profile (using default 09:00 start): {profileless.map((e) => e.fullName).join(", ")}. Set their work start time in the employee&apos;s HR Profile tab.
					</span>
				</div>
			)}

			<div className='overflow-x-auto rounded-md border bg-white'>
				<table className='text-xs border-collapse w-full'>
					<thead>
						<tr>
							<th className='sticky left-0 bg-gray-100 text-left px-3 py-2 font-semibold text-gray-700 min-w-40 z-10 border-b'>Employee</th>
							{days.map((date) => {
								const dayNum = Number(date.slice(8));
								return (
									<th key={date} className={`px-1 py-2 font-medium text-gray-500 border-b min-w-8 ${isWeekend(date) ? "bg-blue-50/60" : "bg-gray-50"} ${date === today ? "bg-primary/10 text-primary" : ""}`}>
										{dayNum}
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{employees.map((employee) => (
							<tr key={employee.id} className='border-b last:border-b-0'>
								<td className='sticky left-0 bg-white px-3 py-1.5 font-medium text-gray-800 whitespace-nowrap z-10 border-r'>{employee.fullName}</td>
								{days.map((date) => {
									const record = records[`${employee.id}|${date}`];
									const chip = record ? STATUS_CHIP[record.status] : null;
									return (
										<td key={date} className={`text-center p-0.5 ${isWeekend(date) ? "bg-blue-50/40" : ""}`}>
											<button
												type='button'
												onClick={() => openCell(employee, date)}
												title={record ? `${record.status}${record.earlyLeaveReason ? ` · early leave: ${record.earlyLeaveReason}` : ""}` : "No entry — click to record"}
												className={`w-7 h-7 rounded text-[11px] font-bold inline-flex items-center justify-center transition-colors cursor-pointer ${
													chip ? chip.className : "text-gray-300 hover:bg-gray-100"
												} ${record?.earlyLeaveReason ? "ring-2 ring-purple-300" : ""}`}>
												{chip ? chip.label : "·"}
											</button>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className='text-xs text-gray-500'>
				Click any cell to record the day. A purple ring marks days with an early leave. Every 3rd &quot;Other&quot; early leave in a month automatically deducts 2 days of basic salary.
			</p>

			<AttendanceDayDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				employee={selected?.employee ?? null}
				date={selected?.date ?? null}
				record={selected ? records[`${selected.employee.id}|${selected.date}`] ?? null : null}
			/>
		</div>
	);
}
