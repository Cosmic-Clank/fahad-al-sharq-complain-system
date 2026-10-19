"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarHeart, CheckCircle, XCircle, Plus, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import SignaturePad, { type SignaturePadHandle } from "@/components/SignaturePad";
import LeaveDetailsFields, { type LeaveDetailsValue } from "@/app/(auth)/dashboard/components/LeaveDetailsFields";
import DownloadPdfButton from "../components/DownloadPdfButton";
import { exportLeavePdf } from "../hrReportActions";
import { toast } from "@/lib/notify";
import { countLeaveDays, formatLeaveDate, LEAVE_STATUS_LABELS, LEAVE_STATUS_STYLES, LEAVE_TYPE_LABELS, MAX_LEAVE_DAYS } from "@/lib/hr-leave";
import { decideLeave, recordLeave } from "./actions";

export interface LeaveRow {
	id: number;
	userId: number;
	employeeName: string;
	type: string;
	startDate: string;
	endDate: string;
	days: number;
	reason: string | null;
	status: string;
	signatureRequired: boolean;
	hasEmployeeSignature: boolean;
	hasAdminSignature: boolean;
	createdByAdminName: string | null;
	requestedAt: string;
	decidedAt: string | null;
	decidedByName: string | null;
	decisionNote: string | null;
}

interface LeaveSectionProps {
	rows: LeaveRow[];
	/** Show the employee name on each card (central list) linking to `${employeesBase}/{id}/leave`. */
	employeesBase?: string;
	/** When set, shows "Record Leave" for this employee (profile tab). */
	recordFor?: { userId: number; fullName: string; signatureRequired: boolean };
	today: string;
	emptyText?: string;
}

export default function LeaveSection({ rows, employeesBase, recordFor, today, emptyText = "No leave requests." }: LeaveSectionProps) {
	const router = useRouter();
	const [isBusy, setIsBusy] = useState(false);

	// Approve / reject dialog
	const [decision, setDecision] = useState<{ row: LeaveRow; kind: "APPROVED" | "REJECTED" } | null>(null);
	const [note, setNote] = useState("");
	const [adminSigned, setAdminSigned] = useState(false);
	const decidePadRef = useRef<SignaturePadHandle>(null);

	// Record-leave dialog
	const [recordOpen, setRecordOpen] = useState(false);
	const [details, setDetails] = useState<LeaveDetailsValue>({ type: "", startDate: "", endDate: "" });
	const [recordReason, setRecordReason] = useState("");
	const [empSigned, setEmpSigned] = useState(false);
	const [recAdminSigned, setRecAdminSigned] = useState(false);
	const empPadRef = useRef<SignaturePadHandle>(null);
	const recAdminPadRef = useRef<SignaturePadHandle>(null);

	const openDecision = (row: LeaveRow, kind: "APPROVED" | "REJECTED") => {
		setDecision({ row, kind });
		setNote("");
		setAdminSigned(false);
	};

	const needsAdminSig = decision?.kind === "APPROVED" && decision.row.signatureRequired;

	const submitDecision = async () => {
		if (!decision) return;
		if (needsAdminSig && (!decidePadRef.current || decidePadRef.current.isEmpty())) {
			toast.error("Your signature is required to approve this leave.");
			return;
		}
		setIsBusy(true);
		try {
			const fd = new FormData();
			fd.append("leaveId", String(decision.row.id));
			fd.append("decision", decision.kind);
			fd.append("note", note);
			if (needsAdminSig && decidePadRef.current) fd.append("adminSignature", decidePadRef.current.toDataURL());
			const result = await decideLeave(fd);
			if (result.success) {
				toast.success(result.message);
				setDecision(null);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsBusy(false);
		}
	};

	const recordDays = countLeaveDays(details.startDate, details.endDate);
	const recordMissing = !details.type
		? "Choose the type of leave"
		: !details.startDate || !details.endDate
			? "Choose the dates"
			: recordDays === 0 || recordDays > MAX_LEAVE_DAYS
				? "Check the dates"
				: recordFor?.signatureRequired && (!empSigned || !recAdminSigned)
					? "Both signatures are required"
					: null;

	const submitRecord = async () => {
		if (!recordFor || recordMissing) return;
		setIsBusy(true);
		try {
			const fd = new FormData();
			fd.append("userId", String(recordFor.userId));
			fd.append("type", details.type);
			fd.append("startDate", details.startDate);
			fd.append("endDate", details.endDate);
			fd.append("reason", recordReason);
			if (recordFor.signatureRequired) {
				fd.append("employeeSignature", empPadRef.current?.toDataURL() ?? "");
				fd.append("adminSignature", recAdminPadRef.current?.toDataURL() ?? "");
			}
			const result = await recordLeave(fd);
			if (result.success) {
				toast.success(result.message);
				setRecordOpen(false);
				setDetails({ type: "", startDate: "", endDate: "" });
				setRecordReason("");
				setEmpSigned(false);
				setRecAdminSigned(false);
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
			{recordFor && (
				<div className='flex items-center justify-between flex-wrap gap-3'>
					<div>
						<h2 className='text-lg font-semibold flex items-center gap-2'>
							<CalendarHeart className='w-5 h-5 text-primary' /> Leave
						</h2>
						<p className='text-sm text-gray-500'>
							{recordFor.signatureRequired ? "Signatures required: 2+ years of service or no joining date set." : "No signature required (under 2 years of service)."}
						</p>
					</div>
					<Button size='sm' onClick={() => setRecordOpen(true)}>
						<Plus className='w-4 h-4 mr-1' /> Record Leave
					</Button>
				</div>
			)}

			{rows.length === 0 ? (
				<Card className='p-8 text-center text-gray-500 text-sm'>{emptyText}</Card>
			) : (
				<div className='space-y-3'>
					{rows.map((r) => (
						<Card key={r.id} className='p-4'>
							<div className='flex items-start justify-between flex-wrap gap-3'>
								<div className='space-y-1 text-sm'>
									<div className='flex items-center gap-2 flex-wrap'>
										<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${LEAVE_STATUS_STYLES[r.status] ?? ""}`}>{LEAVE_STATUS_LABELS[r.status] ?? r.status}</span>
										<span className='text-xs text-gray-400'>#{r.id}</span>
										{employeesBase && (
											<Link href={`${employeesBase}/${r.userId}/leave`} className='font-medium text-primary hover:underline'>
												{r.employeeName}
											</Link>
										)}
									</div>
									<p className='font-semibold'>
										{r.days} day{r.days === 1 ? "" : "s"} of {LEAVE_TYPE_LABELS[r.type] ?? r.type}
									</p>
									<p className='text-gray-600'>
										{formatLeaveDate(r.startDate)} → {formatLeaveDate(r.endDate)}
									</p>
									{r.reason && (
										<p className='text-gray-600'>
											<span className='font-medium'>Reason:</span> {r.reason}
										</p>
									)}
									<div className='text-xs text-gray-500 space-x-3'>
										<span>{r.createdByAdminName ? `Recorded by ${r.createdByAdminName}` : `Requested ${r.requestedAt}`}</span>
										{r.decidedAt && r.decidedByName && r.status !== "CANCELLED" && (
											<span>
												{r.status === "APPROVED" ? "Approved" : "Rejected"} by {r.decidedByName} · {r.decidedAt}
											</span>
										)}
									</div>
									{r.signatureRequired ? (
										<div className='text-xs space-x-3'>
											<span className={r.hasEmployeeSignature ? "text-green-600" : "text-amber-600"}>{r.hasEmployeeSignature ? "✓ Employee signed" : "Employee signature missing"}</span>
											{r.status === "APPROVED" && <span className={r.hasAdminSignature ? "text-green-600" : "text-amber-600"}>{r.hasAdminSignature ? "✓ Admin signed" : "Admin signature missing"}</span>}
										</div>
									) : (
										<p className='text-xs text-gray-400'>No signature required (under 2 years of service)</p>
									)}
									{r.decisionNote && (
										<p className='text-gray-700'>
											<span className='font-medium'>Note:</span> {r.decisionNote}
										</p>
									)}
								</div>
								<div className='flex items-center gap-2'>
									{r.status === "PENDING" && (
										<>
											<Button size='sm' onClick={() => openDecision(r, "APPROVED")} disabled={isBusy}>
												<CheckCircle className='w-4 h-4 mr-1' /> Approve
											</Button>
											<Button size='sm' variant='outline' className='text-red-600' onClick={() => openDecision(r, "REJECTED")} disabled={isBusy}>
												<XCircle className='w-4 h-4 mr-1' /> Reject
											</Button>
										</>
									)}
									{r.status === "APPROVED" && <DownloadPdfButton getPdf={() => exportLeavePdf(r.id)} label='Leave Form PDF' />}
								</div>
							</div>
						</Card>
					))}
				</div>
			)}

			{/* Approve / reject */}
			<Dialog open={!!decision} onOpenChange={(open) => !open && setDecision(null)}>
				<DialogContent className='max-w-lg'>
					<DialogHeader>
						<DialogTitle>{decision?.kind === "APPROVED" ? "Approve leave" : "Reject leave"}</DialogTitle>
						<DialogDescription>
							{decision && `${decision.row.employeeName}: ${decision.row.days} day(s) of ${LEAVE_TYPE_LABELS[decision.row.type]}, ${formatLeaveDate(decision.row.startDate)} → ${formatLeaveDate(decision.row.endDate)}`}
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-4 py-2'>
						{needsAdminSig && (
							<>
								<p className='text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-2'>
									<PenLine className='w-4 h-4 shrink-0' /> This employee has 2+ years of service (or no joining date), so your signature is required.
								</p>
								<SignaturePad ref={decidePadRef} label='Admin signature' onEmptyChange={(empty) => setAdminSigned(!empty)} disabled={isBusy} />
							</>
						)}
						<div className='space-y-1'>
							<Label htmlFor='leave-note'>{decision?.kind === "REJECTED" ? "Reason for rejection (shown to the employee)" : "Note (optional)"}</Label>
							<Textarea id='leave-note' value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} disabled={isBusy} />
						</div>
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setDecision(null)} disabled={isBusy}>
							Cancel
						</Button>
						<Button onClick={submitDecision} disabled={isBusy || (needsAdminSig && !adminSigned)} className={decision?.kind === "REJECTED" ? "bg-red-600 hover:bg-red-700" : ""}>
							{isBusy ? <Loading /> : decision?.kind === "APPROVED" ? "Approve" : "Reject"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Record leave on the employee's behalf */}
			{recordFor && (
				<Dialog open={recordOpen} onOpenChange={setRecordOpen}>
					<DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
						<DialogHeader>
							<DialogTitle>Record leave for {recordFor.fullName}</DialogTitle>
							<DialogDescription>For staff who don&apos;t use the app. It is approved immediately{recordFor.signatureRequired ? " — the employee signs on this screen, then you sign." : "."}</DialogDescription>
						</DialogHeader>
						<div className='space-y-4 py-2'>
							<LeaveDetailsFields value={details} onChange={setDetails} today={today} allowPast disabled={isBusy} />
							<div className='space-y-1'>
								<Label htmlFor='record-reason'>Reason (optional)</Label>
								<Textarea id='record-reason' value={recordReason} onChange={(e) => setRecordReason(e.target.value)} rows={2} maxLength={500} disabled={isBusy} />
							</div>
							{recordFor.signatureRequired && (
								<>
									<SignaturePad ref={empPadRef} label={`Employee signature (${recordFor.fullName})`} onEmptyChange={(empty) => setEmpSigned(!empty)} disabled={isBusy} />
									<SignaturePad ref={recAdminPadRef} label='Admin signature' onEmptyChange={(empty) => setRecAdminSigned(!empty)} disabled={isBusy} />
								</>
							)}
						</div>
						<DialogFooter>
							<Button variant='outline' onClick={() => setRecordOpen(false)} disabled={isBusy}>
								Cancel
							</Button>
							<Button onClick={submitRecord} disabled={isBusy || !!recordMissing}>
								{isBusy ? <Loading /> : recordMissing ?? "Record & Approve"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
