"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { askConfirm, toast } from "@/lib/notify";
import { cancelMyLeave } from "../actions";

export default function CancelLeaveButton({ leaveId }: { leaveId: number }) {
	const router = useRouter();
	const [isBusy, setIsBusy] = useState(false);

	const handleCancel = async () => {
		if (!askConfirm("Cancel this leave request?")) return;
		setIsBusy(true);
		try {
			const result = await cancelMyLeave(leaveId);
			if (result.success) {
				toast.success(result.message);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsBusy(false);
		}
	};

	return (
		<Button type='button' variant='outline' size='sm' className='text-red-600' onClick={handleCancel} disabled={isBusy}>
			Cancel request
		</Button>
	);
}
