"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { upsertEmployeeProfile } from "../actions";

interface HrProfileFormProps {
	userId: number;
	initial: {
		nationality: string;
		joiningDate: string; // "YYYY-MM-DD" or ""
		basicSalary: number;
		allowances: number;
		workStartTime: string;
		leaveSalaryOverride: number | null;
		passportHeldByCompany: boolean;
	};
}

export default function HrProfileForm({ userId, initial }: HrProfileFormProps) {
	const router = useRouter();
	const [isSaving, setIsSaving] = useState(false);
	const [form, setForm] = useState({
		nationality: initial.nationality,
		joiningDate: initial.joiningDate,
		basicSalary: String(initial.basicSalary),
		allowances: String(initial.allowances),
		workStartTime: initial.workStartTime,
		leaveSalaryOverride: initial.leaveSalaryOverride === null ? "" : String(initial.leaveSalaryOverride),
		passportHeldByCompany: initial.passportHeldByCompany ? "true" : "false",
	});

	const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			const fd = new FormData();
			fd.append("userId", String(userId));
			fd.append("nationality", form.nationality);
			fd.append("joiningDate", form.joiningDate);
			fd.append("basicSalary", form.basicSalary || "0");
			fd.append("allowances", form.allowances || "0");
			fd.append("workStartTime", form.workStartTime || "09:00");
			fd.append("leaveSalaryOverride", form.leaveSalaryOverride);
			fd.append("passportHeldByCompany", form.passportHeldByCompany);

			const result = await upsertEmployeeProfile(fd);
			if (result.success) {
				toast.success(result.message);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className='bg-white rounded-lg border p-6 space-y-4 max-w-2xl'>
			<h2 className='text-lg font-semibold'>HR Profile</h2>

			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<div className='space-y-1'>
					<Label htmlFor='nationality'>Nationality</Label>
					<Input id='nationality' value={form.nationality} onChange={set("nationality")} placeholder='e.g. Pakistani' disabled={isSaving} />
				</div>
				<div className='space-y-1'>
					<Label htmlFor='joiningDate'>Joining Date</Label>
					<Input id='joiningDate' type='date' value={form.joiningDate} onChange={set("joiningDate")} disabled={isSaving} />
				</div>
				<div className='space-y-1'>
					<Label htmlFor='basicSalary'>Basic Salary (AED)</Label>
					<Input id='basicSalary' type='number' min='0' step='0.01' value={form.basicSalary} onChange={set("basicSalary")} disabled={isSaving} />
				</div>
				<div className='space-y-1'>
					<Label htmlFor='allowances'>Allowances (AED)</Label>
					<Input id='allowances' type='number' min='0' step='0.01' value={form.allowances} onChange={set("allowances")} disabled={isSaving} />
				</div>
				<div className='space-y-1'>
					<Label htmlFor='workStartTime'>Work Start Time</Label>
					<Input id='workStartTime' type='time' value={form.workStartTime} onChange={set("workStartTime")} disabled={isSaving} />
					<p className='text-xs text-gray-500'>Arrivals after this time are marked Late automatically.</p>
				</div>
				<div className='space-y-1'>
					<Label htmlFor='leaveSalaryOverride'>Leave Salary Override (AED)</Label>
					<Input id='leaveSalaryOverride' type='number' min='0' step='0.01' value={form.leaveSalaryOverride} onChange={set("leaveSalaryOverride")} placeholder='Leave empty for automatic' disabled={isSaving} />
					<p className='text-xs text-gray-500'>Automatic: 1 month basic salary per completed year of service.</p>
				</div>
				<div className='space-y-1'>
					<Label>Passport Held By Company</Label>
					<Select value={form.passportHeldByCompany} onValueChange={(v) => setForm({ ...form, passportHeldByCompany: v })} disabled={isSaving}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='true'>Yes — kept by company</SelectItem>
							<SelectItem value='false'>No — with employee</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<Button type='submit' disabled={isSaving}>
				{isSaving ? (
					<>
						<Loading />
						Saving...
					</>
				) : (
					"Save HR Profile"
				)}
			</Button>
		</form>
	);
}
