"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { toast } from "@/lib/notify";
import { setComplaintCharge } from "./complaint-charge-actions";

export interface ComplaintCharge {
	amount: number | null;
	/** Dubai date-time text */
	at: string | null;
	by: string | null;
}

/** Admin-only box on a private complaint: what the customer was charged (feeds the Earnings report). */
export default function ComplaintChargeCard({ complaintId, charge }: { complaintId: number; charge: ComplaintCharge }) {
	const router = useRouter();
	const [value, setValue] = useState(charge.amount !== null ? String(charge.amount) : "");
	const [isSaving, setIsSaving] = useState(false);

	const changed = value.trim() !== (charge.amount !== null ? String(charge.amount) : "");

	const save = async (amount: number | null) => {
		setIsSaving(true);
		try {
			const result = await setComplaintCharge(complaintId, amount);
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

	const onSave = () => {
		const amount = Number(value);
		if (value.trim() === "" || !Number.isFinite(amount) || amount < 0) {
			toast.error("Enter the amount charged in AED.");
			return;
		}
		save(amount);
	};

	return (
		<div className='p-5 border-b border-gray-100 bg-emerald-50/60'>
			<div className='flex items-center gap-2 mb-2'>
				<Banknote className='w-4 h-4 text-emerald-700' />
				<h4 className='text-sm font-semibold text-gray-800'>Amount charged to customer</h4>
			</div>
			<div className='flex flex-wrap items-center gap-2'>
				<div className='relative'>
					<span className='absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500'>AED</span>
					<Input
						type='number'
						inputMode='decimal'
						min='0'
						step='0.01'
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && changed) onSave();
						}}
						placeholder='0.00'
						className='w-40 pl-11 bg-white'
						disabled={isSaving}
					/>
				</div>
				<Button size='sm' onClick={onSave} disabled={isSaving || !changed}>
					{isSaving ? <Loading /> : "Save"}
				</Button>
				{charge.amount !== null && (
					<Button size='sm' variant='ghost' className='text-gray-500' onClick={() => save(null)} disabled={isSaving}>
						Clear
					</Button>
				)}
			</div>
			<p className='text-xs text-gray-500 mt-2'>
				{charge.amount !== null && charge.at ? `Recorded by ${charge.by ?? "admin"} on ${charge.at}. Shown in Private Complaints → Earnings.` : "Not recorded yet. Only admins can see this."}
			</p>
		</div>
	);
}
