"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import { BookUser, Plus, CheckCircle, XCircle, PenLine } from "lucide-react";
import { toast } from "sonner";
import { createHandover, setHandoverStatus, signHandoverStage } from "../actions";

export interface HandoverRow {
	id: number;
	status: string;
	requestReason: string | null;
	requestedAt: string;
	approvedAt: string | null;
	handedOverAt: string | null;
	returnedAt: string | null;
	handledByAdminName: string | null;
	hasHandoverSignatures: boolean;
	hasReturnSignatures: boolean;
}

const STATUS_STYLES: Record<string, string> = {
	REQUESTED: "bg-blue-100 text-blue-800",
	APPROVED: "bg-amber-100 text-amber-800",
	HANDED_OVER: "bg-purple-100 text-purple-800",
	RETURNED: "bg-green-100 text-green-800",
	REJECTED: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
	REQUESTED: "Requested",
	APPROVED: "Approved — awaiting handover",
	HANDED_OVER: "Handed over (with employee)",
	RETURNED: "Returned",
	REJECTED: "Rejected",
};

export default function HandoversSection({ userId, employeeName, handovers }: { userId: number; employeeName: string; handovers: HandoverRow[] }) {
	const router = useRouter();
	const [createOpen, setCreateOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [signOpen, setSignOpen] = useState(false);
	const [signTarget, setSignTarget] = useState<{ id: number; stage: "HANDOVER" | "RETURN" } | null>(null);
	const [isBusy, setIsBusy] = useState(false);

	const employeePadRef = useRef<SignatureCanvas>(null);
	const adminPadRef = useRef<SignatureCanvas>(null);

	const hasOpen = handovers.some((h) => ["REQUESTED", "APPROVED", "HANDED_OVER"].includes(h.status));

	const handleCreate = async () => {
		setIsBusy(true);
		try {
			const fd = new FormData();
			fd.append("userId", String(userId));
			fd.append("requestReason", reason);
			const result = await createHandover(fd);
			if (result.success) {
				toast.success(result.message);
				setCreateOpen(false);
				setReason("");
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsBusy(false);
		}
	};

	const handleStatus = async (id: number, status: "APPROVED" | "REJECTED") => {
		setIsBusy(true);
		try {
			const result = await setHandoverStatus(id, status);
			result.success ? toast.success(result.message) : toast.error(result.message);
			if (result.success) router.refresh();
		} finally {
			setIsBusy(false);
		}
	};

	const openSign = (id: number, stage: "HANDOVER" | "RETURN") => {
		setSignTarget({ id, stage });
		setSignOpen(true);
	};

	const handleSign = async () => {
		if (!signTarget) return;
		if (!employeePadRef.current || !adminPadRef.current || employeePadRef.current.isEmpty() || adminPadRef.current.isEmpty()) {
			toast.error("Both signatures are required.");
			return;
		}
		setIsBusy(true);
		try {
			const fd = new FormData();
			fd.append("handoverId", String(signTarget.id));
			fd.append("stage", signTarget.stage);
			fd.append("employeeSignature", employeePadRef.current.toDataURL());
			fd.append("adminSignature", adminPadRef.current.toDataURL());
			const result = await signHandoverStage(fd);
			if (result.success) {
				toast.success(result.message);
				setSignOpen(false);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsBusy(false);
		}
	};

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<div>
					<h2 className='text-lg font-semibold flex items-center gap-2'>
						<BookUser className='w-5 h-5 text-primary' /> Passport Handovers
					</h2>
					<p className='text-sm text-gray-500'>Signed record every time the passport leaves or returns to company custody.</p>
				</div>
				<Button onClick={() => setCreateOpen(true)} size='sm' disabled={hasOpen} title={hasOpen ? "There is already an open handover" : undefined}>
					<Plus className='w-4 h-4 mr-1' /> New Handover
				</Button>
			</div>

			{handovers.length === 0 ? (
				<Card className='p-8 text-center text-gray-500 text-sm'>No passport handovers recorded.</Card>
			) : (
				<div className='space-y-3'>
					{handovers.map((h) => (
						<Card key={h.id} className='p-4'>
							<div className='flex items-start justify-between flex-wrap gap-3'>
								<div className='space-y-1 text-sm'>
									<div className='flex items-center gap-2'>
										<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[h.status] ?? ""}`}>{STATUS_LABELS[h.status] ?? h.status}</span>
										<span className='text-xs text-gray-400'>#{h.id}</span>
									</div>
									{h.requestReason && (
										<p className='text-gray-600'>
											<span className='font-medium'>Reason:</span> {h.requestReason}
										</p>
									)}
									<div className='text-xs text-gray-500 space-x-3'>
										<span>Requested: {h.requestedAt}</span>
										{h.approvedAt && <span>Approved: {h.approvedAt}</span>}
										{h.handedOverAt && <span>Handed over: {h.handedOverAt}</span>}
										{h.returnedAt && <span>Returned: {h.returnedAt}</span>}
									</div>
									{h.handledByAdminName && <p className='text-xs text-gray-500'>Handled by: {h.handledByAdminName}</p>}
									<div className='text-xs text-gray-500'>
										{h.hasHandoverSignatures && <span className='text-green-600 mr-3'>✓ Handover signed (employee + admin)</span>}
										{h.hasReturnSignatures && <span className='text-green-600'>✓ Return signed (employee + admin)</span>}
									</div>
								</div>
								<div className='flex items-center gap-2'>
									{h.status === "REQUESTED" && (
										<>
											<Button size='sm' onClick={() => handleStatus(h.id, "APPROVED")} disabled={isBusy}>
												<CheckCircle className='w-4 h-4 mr-1' /> Approve
											</Button>
											<Button size='sm' variant='outline' className='text-red-600' onClick={() => handleStatus(h.id, "REJECTED")} disabled={isBusy}>
												<XCircle className='w-4 h-4 mr-1' /> Reject
											</Button>
										</>
									)}
									{h.status === "APPROVED" && (
										<Button size='sm' onClick={() => openSign(h.id, "HANDOVER")} disabled={isBusy}>
											<PenLine className='w-4 h-4 mr-1' /> Sign & Hand Over
										</Button>
									)}
									{h.status === "HANDED_OVER" && (
										<Button size='sm' onClick={() => openSign(h.id, "RETURN")} disabled={isBusy}>
											<PenLine className='w-4 h-4 mr-1' /> Sign Return
										</Button>
									)}
								</div>
							</div>
						</Card>
					))}
				</div>
			)}

			{/* Create dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>New Passport Handover</DialogTitle>
						<DialogDescription>Starts an approved handover for {employeeName}. Signatures are collected at the moment of handover.</DialogDescription>
					</DialogHeader>
					<div className='space-y-1 py-2'>
						<Label htmlFor='handover-reason'>Reason</Label>
						<Input id='handover-reason' value={reason} onChange={(e) => setReason(e.target.value)} placeholder='e.g. Visa renewal appointment' disabled={isBusy} />
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setCreateOpen(false)} disabled={isBusy}>
							Cancel
						</Button>
						<Button onClick={handleCreate} disabled={isBusy}>
							{isBusy ? <Loading /> : "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Sign dialog */}
			<Dialog open={signOpen} onOpenChange={setSignOpen}>
				<DialogContent className='max-w-xl'>
					<DialogHeader>
						<DialogTitle>{signTarget?.stage === "HANDOVER" ? "Passport Handover — Signatures" : "Passport Return — Signatures"}</DialogTitle>
						<DialogDescription>
							{signTarget?.stage === "HANDOVER"
								? `Both ${employeeName} and the admin sign to confirm the passport was handed to the employee.`
								: `Both ${employeeName} and the admin sign to confirm the passport was returned to company custody.`}
						</DialogDescription>
					</DialogHeader>

					<div className='space-y-4 py-2'>
						<div className='space-y-1'>
							<div className='flex items-center justify-between'>
								<Label>Employee signature ({employeeName})</Label>
								<Button type='button' variant='ghost' size='sm' onClick={() => employeePadRef.current?.clear()}>
									Clear
								</Button>
							</div>
							<div className='border rounded-md bg-white'>
								<SignatureCanvas ref={employeePadRef} canvasProps={{ width: 500, height: 130, className: "block w-full" }} />
							</div>
						</div>
						<div className='space-y-1'>
							<div className='flex items-center justify-between'>
								<Label>Admin signature</Label>
								<Button type='button' variant='ghost' size='sm' onClick={() => adminPadRef.current?.clear()}>
									Clear
								</Button>
							</div>
							<div className='border rounded-md bg-white'>
								<SignatureCanvas ref={adminPadRef} canvasProps={{ width: 500, height: 130, className: "block w-full" }} />
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant='outline' onClick={() => setSignOpen(false)} disabled={isBusy}>
							Cancel
						</Button>
						<Button onClick={handleSign} disabled={isBusy}>
							{isBusy ? (
								<>
									<Loading />
									Saving...
								</>
							) : (
								"Confirm & Save Signatures"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
