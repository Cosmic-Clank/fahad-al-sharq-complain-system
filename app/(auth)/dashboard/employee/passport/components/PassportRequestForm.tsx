"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { requestMyPassport } from "../actions";

export default function PassportRequestForm({ disabled }: { disabled: boolean }) {
	const router = useRouter();
	const [reason, setReason] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			const fd = new FormData();
			fd.append("reason", reason);
			const result = await requestMyPassport(fd);
			if (result.success) {
				toast.success(result.message);
				setReason("");
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className='flex items-end gap-3 flex-wrap'>
			<div className='space-y-1 flex-1 min-w-64'>
				<Label htmlFor='passport-reason'>Why do you need your passport?</Label>
				<Input id='passport-reason' value={reason} onChange={(e) => setReason(e.target.value)} placeholder='e.g. Bank account opening' disabled={disabled || isSaving} />
			</div>
			<Button type='submit' disabled={disabled || isSaving || reason.trim().length < 3}>
				{isSaving ? (
					<>
						<Loading />
						Submitting...
					</>
				) : (
					"Request My Passport"
				)}
			</Button>
		</form>
	);
}
