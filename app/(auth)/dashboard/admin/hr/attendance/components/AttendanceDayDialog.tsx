"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { upsertAttendanceDay, deleteAttendanceDay } from "../actions";
import { compareHHmm } from "@/lib/hr-dates";

export interface AttendanceCellRecord {
	status: string;
	statusOverridden: boolean;
	arriveTime: string | null;
	lunchOutTime: string | null;
	lunchInTime: string | null;
	leaveTime: string | null;
	earlyLeaveReason: string | null;
	earlyLeaveNote: string | null;
}

interface AttendanceDayDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	employee: { id: number; fullName: string; workStartTime: string } | null;
	date: string | null;
	record: AttendanceCellRecord | null;
}

const EMPTY = {
	statusMode: "AUTO",
	arriveTime: "",
	lunchOutTime: "",
	lunchInTime: "",
	leaveTime: "",
	earlyLeaveReason: "NONE",
	earlyLeaveNote: "",
};

export default function AttendanceDayDialog({ open, onOpenChange, employee, date, record }: AttendanceDayDialogProps) {
	const router = useRouter();
	const [form, setForm] = useState({ ...EMPTY });
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (open) {
			setForm({
				statusMode: record?.statusOverridden ? record.status : "AUTO",
				arriveTime: record?.arriveTime ?? "",
				lunchOutTime: record?.lunchOutTime ?? "",
				lunchInTime: record?.lunchInTime ?? "",
				leaveTime: record?.leaveTime ?? "",
				earlyLeaveReason: record?.earlyLeaveReason ?? "NONE",
				earlyLeaveNote: record?.earlyLeaveNote ?? "",
			});
		}
	}, [open, record]);

	if (!employee || !date) return null;

	// Live preview of the auto-computed status
	const autoStatus = form.arriveTime ? (compareHHmm(form.arriveTime, employee.workStartTime) > 0 ? "LATE" : "PRESENT") : "ABSENT";
	const effectiveStatus = form.statusMode === "AUTO" ? autoStatus : form.statusMode;

	const setTime = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const fd = new FormData();
			fd.append("userId", String(employee.id));
			fd.append("date", date);
			fd.append("statusMode", form.statusMode);
			fd.append("arriveTime", form.arriveTime);
			fd.append("lunchOutTime", form.lunchOutTime);
			fd.append("lunchInTime", form.lunchInTime);
			fd.append("leaveTime", form.leaveTime);
			fd.append("earlyLeaveReason", form.earlyLeaveReason);
			fd.append("earlyLeaveNote", form.earlyLeaveNote);

			const result = await upsertAttendanceDay(fd);
			if (result.success) {
				toast.success(result.message);
				onOpenChange(false);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const result = await deleteAttendanceDay(employee.id, date);
			if (result.success) {
				toast.success(result.message);
				onOpenChange(false);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-w-lg'>
				<DialogHeader>
					<DialogTitle>
						{employee.fullName} — {date}
					</DialogTitle>
					<DialogDescription>Scheduled start: {employee.workStartTime}. Four daily sign-ins; leave times empty if not applicable.</DialogDescription>
				</DialogHeader>

				<div className='space-y-4 py-2'>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-1'>
							<Label htmlFor='att-arrive'>1. Coming into work</Label>
							<Input id='att-arrive' type='time' value={form.arriveTime} onChange={setTime("arriveTime")} disabled={isSaving} />
						</div>
						<div className='space-y-1'>
							<Label htmlFor='att-lunch-out'>2. Leaving to lunch</Label>
							<Input id='att-lunch-out' type='time' value={form.lunchOutTime} onChange={setTime("lunchOutTime")} disabled={isSaving} />
						</div>
						<div className='space-y-1'>
							<Label htmlFor='att-lunch-in'>3. Returning from lunch</Label>
							<Input id='att-lunch-in' type='time' value={form.lunchInTime} onChange={setTime("lunchInTime")} disabled={isSaving} />
						</div>
						<div className='space-y-1'>
							<Label htmlFor='att-leave'>4. Leaving work</Label>
							<Input id='att-leave' type='time' value={form.leaveTime} onChange={setTime("leaveTime")} disabled={isSaving} />
						</div>
					</div>

					<div className='space-y-1'>
						<Label>Status</Label>
						<Select value={form.statusMode} onValueChange={(v) => setForm({ ...form, statusMode: v })} disabled={isSaving}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='AUTO'>Automatic (from arrival time)</SelectItem>
								<SelectItem value='PRESENT'>Present (manual)</SelectItem>
								<SelectItem value='LATE'>Late (manual)</SelectItem>
								<SelectItem value='ABSENT'>Absent (manual)</SelectItem>
							</SelectContent>
						</Select>
						<p className='text-xs text-gray-500'>
							Will be saved as: <span className={`font-semibold ${effectiveStatus === "PRESENT" ? "text-green-600" : effectiveStatus === "LATE" ? "text-amber-600" : "text-red-600"}`}>{effectiveStatus}</span>
							{form.statusMode === "AUTO" && form.arriveTime && ` (arrived ${form.arriveTime}, start ${employee.workStartTime})`}
						</p>
					</div>

					<div className='space-y-1'>
						<Label>Left work early?</Label>
						<Select value={form.earlyLeaveReason} onValueChange={(v) => setForm({ ...form, earlyLeaveReason: v })} disabled={isSaving}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='NONE'>No — full day</SelectItem>
								<SelectItem value='SICK'>A. Sick</SelectItem>
								<SelectItem value='ADDITIONAL_WORK'>B. Additional work</SelectItem>
								<SelectItem value='OTHER'>C. Other</SelectItem>
							</SelectContent>
						</Select>
						{form.earlyLeaveReason === "OTHER" && <p className='text-xs text-amber-600'>Every 3rd "Other" early leave in a month automatically deducts 2 days of basic salary.</p>}
					</div>

					{form.earlyLeaveReason !== "NONE" && (
						<div className='space-y-1'>
							<Label htmlFor='att-note'>Early-leave note</Label>
							<Input id='att-note' value={form.earlyLeaveNote} onChange={(e) => setForm({ ...form, earlyLeaveNote: e.target.value })} placeholder='Optional details' disabled={isSaving} />
						</div>
					)}
				</div>

				<DialogFooter className='flex items-center'>
					{record && (
						<Button variant='outline' className='text-red-600 mr-auto' onClick={handleDelete} disabled={isSaving || isDeleting}>
							{isDeleting ? <Loading /> : "Clear entry"}
						</Button>
					)}
					<Button variant='outline' onClick={() => onOpenChange(false)} disabled={isSaving}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving ? (
							<>
								<Loading />
								Saving...
							</>
						) : (
							"Save"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
