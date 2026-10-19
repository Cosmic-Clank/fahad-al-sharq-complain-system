"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/ui/loading";
import SignaturePad, { type SignaturePadHandle } from "@/components/SignaturePad";
import LeaveDetailsFields, { type LeaveDetailsValue } from "@/app/(auth)/dashboard/components/LeaveDetailsFields";
import { toast } from "@/lib/notify";
import { validateLeaveRange } from "@/lib/hr-leave";
import { translateMessage } from "@/lib/messages-ar";
import { requestLeave } from "../actions";

interface LeaveRequestFormProps {
	today: string;
	signatureRequired: boolean;
	/** Why a signature is needed, shown above the pad. */
	signatureReason: string;
}

const EMPTY: LeaveDetailsValue = { type: "", startDate: "", endDate: "" };

export default function LeaveRequestForm({ today, signatureRequired, signatureReason }: LeaveRequestFormProps) {
	const router = useRouter();
	const [details, setDetails] = useState<LeaveDetailsValue>(EMPTY);
	const [reason, setReason] = useState("");
	const [signed, setSigned] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const padRef = useRef<SignaturePadHandle>(null);

	const rangeError = details.type && details.startDate && details.endDate ? validateLeaveRange(details.type, details.startDate, details.endDate, today) : null;

	// The button always says what is still missing — no guessing why it won't submit
	const missing = !details.type
		? "Choose the type of leave"
		: !details.startDate || !details.endDate
			? "Choose the dates"
			: rangeError
				? rangeError
				: signatureRequired && !signed
					? "Sign in the box above"
					: null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (missing) return;
		setIsSaving(true);
		try {
			const fd = new FormData();
			fd.append("type", details.type);
			fd.append("startDate", details.startDate);
			fd.append("endDate", details.endDate);
			fd.append("reason", reason);
			if (signatureRequired && padRef.current && !padRef.current.isEmpty()) fd.append("employeeSignature", padRef.current.toDataURL());
			const result = await requestLeave(fd);
			if (result.success) {
				toast.success(result.message);
				setDetails(EMPTY);
				setReason("");
				padRef.current?.clear();
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className='space-y-5'>
			<LeaveDetailsFields value={details} onChange={setDetails} today={today} disabled={isSaving} />

			<div className='space-y-2'>
				<Label htmlFor='leave-reason' className='text-base'>
					3. Reason <span className='text-sm font-normal text-gray-500'>(optional)</span>
				</Label>
				<Textarea id='leave-reason' value={reason} onChange={(e) => setReason(e.target.value)} placeholder='e.g. Travelling home to see family' maxLength={500} rows={2} disabled={isSaving} />
			</div>

			{signatureRequired && (
				<div className='space-y-2'>
					<Label className='text-base flex items-center gap-2'>
						<PenLine className='w-4 h-4' /> 4. Your signature
					</Label>
					<p className='text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2'>{signatureReason}</p>
					<SignaturePad ref={padRef} label='Employee signature' onEmptyChange={(empty) => setSigned(!empty)} disabled={isSaving} />
				</div>
			)}

			{rangeError && (
				<p translate='no' className='notranslate text-sm text-red-600'>
					{translateMessage(rangeError)}
				</p>
			)}

			{/* Text changes with form state, so it is translated here rather than by Google Translate */}
			<Button type='submit' translate='no' className='notranslate w-full h-12 text-base' disabled={!!missing || isSaving}>
				{isSaving ? (
					<>
						<Loading /> Sending...
					</>
				) : missing ? (
					translateMessage(missing)
				) : (
					<>
						<Send className='w-4 h-4 mr-2' /> Send Leave Request
					</>
				)}
			</Button>
		</form>
	);
}
