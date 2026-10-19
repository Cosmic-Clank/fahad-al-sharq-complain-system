"use client";

import React from "react";
import { Palmtree, Thermometer, Siren, Wallet, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { countLeaveDays, formatLeaveDate, LEAVE_TYPE_LABELS, MAX_LEAVE_DAYS, shiftYmd, SICK_BACKDATE_DAYS } from "@/lib/hr-leave";

const TYPE_OPTIONS = [
	{ value: "ANNUAL", icon: Palmtree, hint: "Holiday / vacation" },
	{ value: "SICK", icon: Thermometer, hint: "You are ill" },
	{ value: "EMERGENCY", icon: Siren, hint: "Family emergency" },
	{ value: "UNPAID", icon: Wallet, hint: "Leave without pay" },
] as const;

export interface LeaveDetailsValue {
	type: string;
	startDate: string;
	endDate: string;
}

interface LeaveDetailsFieldsProps {
	value: LeaveDetailsValue;
	onChange: (value: LeaveDetailsValue) => void;
	/** Dubai-local "YYYY-MM-DD". */
	today: string;
	/** HR recording after the fact may pick past dates; employees may not (except sick leave). */
	allowPast?: boolean;
	disabled?: boolean;
}

/** Leave type buttons + date range + a plain-language summary of what is being requested. */
export default function LeaveDetailsFields({ value, onChange, today, allowPast, disabled }: LeaveDetailsFieldsProps) {
	const minDate = allowPast ? undefined : value.type === "SICK" ? shiftYmd(today, -SICK_BACKDATE_DAYS) : today;
	const days = countLeaveDays(value.startDate, value.endDate);

	const setStart = (startDate: string) => {
		// Keep the range valid: moving the start past the end drags the end along
		const endDate = !value.endDate || value.endDate < startDate ? startDate : value.endDate;
		onChange({ ...value, startDate, endDate });
	};

	return (
		<div className='space-y-5'>
			<div className='space-y-2'>
				<Label className='text-base'>1. What kind of leave?</Label>
				<div className='grid grid-cols-2 gap-2'>
					{TYPE_OPTIONS.map(({ value: type, icon: Icon, hint }) => {
						const selected = value.type === type;
						return (
							<button
								key={type}
								type='button'
								disabled={disabled}
								onClick={() => onChange({ ...value, type })}
								className={cn(
									"flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors cursor-pointer disabled:opacity-50",
									selected ? "border-primary bg-primary/10" : "border-gray-200 hover:border-gray-300 bg-white"
								)}>
								<Icon className={cn("w-6 h-6 shrink-0", selected ? "text-primary" : "text-gray-400")} />
								<span>
									<span className='block font-semibold text-sm'>{LEAVE_TYPE_LABELS[type]}</span>
									<span className='block text-xs text-gray-500'>{hint}</span>
								</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className='space-y-2'>
				<Label className='text-base'>2. Which days?</Label>
				<div className='grid grid-cols-2 gap-3'>
					<div className='space-y-1'>
						<Label htmlFor='leave-start' className='text-xs text-gray-600'>
							First day of leave
						</Label>
						<Input id='leave-start' type='date' min={minDate} value={value.startDate} onChange={(e) => setStart(e.target.value)} disabled={disabled} className='h-11' />
					</div>
					<div className='space-y-1'>
						<Label htmlFor='leave-end' className='text-xs text-gray-600'>
							Last day of leave
						</Label>
						<Input id='leave-end' type='date' min={value.startDate || minDate} value={value.endDate} onChange={(e) => onChange({ ...value, endDate: e.target.value })} disabled={disabled} className='h-11' />
					</div>
				</div>
			</div>

			{value.type && days > 0 && (
				<div className={cn("flex items-start gap-2 rounded-md border p-3 text-sm", days > MAX_LEAVE_DAYS ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-900")}>
					<CalendarDays className='w-5 h-5 shrink-0' />
					<span>
						<strong>
							{days} day{days === 1 ? "" : "s"} of {LEAVE_TYPE_LABELS[value.type]}
						</strong>
						<br />
						{formatLeaveDate(value.startDate)} → {formatLeaveDate(value.endDate)}
						{days > MAX_LEAVE_DAYS && <span className='block font-medium'>Too long — the maximum is {MAX_LEAVE_DAYS} days per request.</span>}
					</span>
				</div>
			)}
		</div>
	);
}
