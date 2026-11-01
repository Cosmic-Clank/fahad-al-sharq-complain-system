"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Plus, PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading } from "@/components/ui/loading";
import SignaturePad, { type SignaturePadHandle } from "@/components/SignaturePad";
import DownloadPdfButton from "@/app/(auth)/dashboard/admin/hr/components/DownloadPdfButton";
import { exportJointLetterPdf } from "@/app/(auth)/dashboard/admin/hr/hrReportActions";
import { askConfirm, toast } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { describePenalty, JOINT_LETTER_TYPE_LABELS, JOINT_LETTER_TYPE_STYLES, letterTemplate, MAX_BODY, MAX_SUBJECT, type LetterPenalty } from "@/lib/joint-letters";
import { createJointLetter, deleteJointLetter, signJointLetter } from "../actions";

export interface LetterRow {
	id: number;
	type: string;
	subject: string;
	body: string;
	letterDate: string;
	penaltyLabel: string | null;
	createdByName: string;
	signedAt: string | null;
	signedByAdminName: string | null;
}

export interface PenaltyOption extends LetterPenalty {
	id: number;
}

const NO_PENALTY = "none";

export default function LettersSection({ userId, employeeName, letters, penalties, today }: { userId: number; employeeName: string; letters: LetterRow[]; penalties: PenaltyOption[]; today: string }) {
	const router = useRouter();
	const [isBusy, setIsBusy] = useState(false);

	// New-letter dialog
	const [createOpen, setCreateOpen] = useState(false);
	const [type, setType] = useState("");
	const [penaltyId, setPenaltyId] = useState(NO_PENALTY);
	const [subject, setSubject] = useState("");
	const [body, setBody] = useState("");
	const [letterDate, setLetterDate] = useState(today);
	const [signNow, setSignNow] = useState(true);
	const [empSigned, setEmpSigned] = useState(false);
	const [adminSigned, setAdminSigned] = useState(false);
	const empPadRef = useRef<SignaturePadHandle>(null);
	const adminPadRef = useRef<SignaturePadHandle>(null);

	// Sign-later dialog
	const [signTarget, setSignTarget] = useState<LetterRow | null>(null);
	const [laterEmpSigned, setLaterEmpSigned] = useState(false);
	const [laterAdminSigned, setLaterAdminSigned] = useState(false);
	const laterEmpRef = useRef<SignaturePadHandle>(null);
	const laterAdminRef = useRef<SignaturePadHandle>(null);

	const penaltyById = (id: string) => penalties.find((p) => String(p.id) === id) ?? null;

	/** Choosing a type (or penalty) refills the template — only while the text is still untouched. */
	const applyTemplate = (nextType: string, nextPenaltyId: string) => {
		const untouched = !body || Object.keys(JOINT_LETTER_TYPE_LABELS).some((t) => letterTemplate(t, employeeName, penaltyById(penaltyId)).body === body);
		if (!untouched && !askConfirm("Replace the letter text with the template for this type?")) return;
		const t = letterTemplate(nextType, employeeName, penaltyById(nextPenaltyId));
		setSubject(t.subject);
		setBody(t.body);
	};

	const openCreate = () => {
		setType("");
		setPenaltyId(NO_PENALTY);
		setSubject("");
		setBody("");
		setLetterDate(today);
		setSignNow(true);
		setEmpSigned(false);
		setAdminSigned(false);
		setCreateOpen(true);
	};

	const createMissing = !type
		? "Choose the type of letter"
		: subject.trim().length < 3
			? "Enter a subject"
			: body.trim().length < 20
				? "Write the letter text"
				: !letterDate
					? "Choose the letter date"
					: signNow && (!empSigned || !adminSigned)
						? "Both signatures are required"
						: null;

	const submitCreate = async () => {
		if (createMissing) return;
		setIsBusy(true);
		try {
			const fd = new FormData();
			fd.append("userId", String(userId));
			fd.append("type", type);
			fd.append("subject", subject);
			fd.append("body", body);
			fd.append("letterDate", letterDate);
			fd.append("penaltyId", penaltyId === NO_PENALTY ? "" : penaltyId);
			if (signNow) {
				fd.append("employeeSignature", empPadRef.current?.toDataURL() ?? "");
				fd.append("adminSignature", adminPadRef.current?.toDataURL() ?? "");
			}
			const result = await createJointLetter(fd);
			if (result.success) {
				toast.success(result.message);
				setCreateOpen(false);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsBusy(false);
		}
	};

	const submitSign = async () => {
		if (!signTarget || !laterEmpSigned || !laterAdminSigned) return;
		setIsBusy(true);
		try {
			const fd = new FormData();
			fd.append("letterId", String(signTarget.id));
			fd.append("employeeSignature", laterEmpRef.current?.toDataURL() ?? "");
			fd.append("adminSignature", laterAdminRef.current?.toDataURL() ?? "");
			const result = await signJointLetter(fd);
			if (result.success) {
				toast.success(result.message);
				setSignTarget(null);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsBusy(false);
		}
	};

	const handleDelete = async (letter: LetterRow) => {
		if (!askConfirm("Delete this unsigned letter?")) return;
		setIsBusy(true);
		try {
			const result = await deleteJointLetter(letter.id);
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
		<div className='space-y-4'>
			<div className='flex items-center justify-between flex-wrap gap-3'>
				<div>
					<h2 className='text-lg font-semibold flex items-center gap-2'>
						<FileSignature className='w-5 h-5 text-primary' /> Joint Letters
					</h2>
					<p className='text-sm text-gray-500'>Official letters signed by both {employeeName} and the company.</p>
				</div>
				<Button size='sm' onClick={openCreate}>
					<Plus className='w-4 h-4 mr-1' /> New Joint Letter
				</Button>
			</div>

			{letters.length === 0 ? (
				<Card className='p-8 text-center text-gray-500 text-sm'>No joint letters yet.</Card>
			) : (
				<div className='space-y-3'>
					{letters.map((l) => (
						<Card key={l.id} className='p-4'>
							<div className='flex items-start justify-between flex-wrap gap-3'>
								<div className='space-y-1 text-sm min-w-0 flex-1'>
									<div className='flex items-center gap-2 flex-wrap'>
										<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${JOINT_LETTER_TYPE_STYLES[l.type] ?? ""}`}>{JOINT_LETTER_TYPE_LABELS[l.type] ?? l.type}</span>
										<span className='text-xs text-gray-400'>#{l.id}</span>
										<span className='text-xs text-gray-500'>{l.letterDate}</span>
									</div>
									<p className='font-semibold'>{l.subject}</p>
									<p className='text-gray-600 line-clamp-2 whitespace-pre-line'>{l.body}</p>
									{l.penaltyLabel && <p className='text-xs text-red-700'>Penalty: {l.penaltyLabel}</p>}
									<p className='text-xs text-gray-500'>
										Created by {l.createdByName} ·{" "}
										{l.signedAt ? <span className='text-green-600'>✓ Signed by employee and {l.signedByAdminName} on {l.signedAt}</span> : <span className='text-amber-600'>Not signed yet</span>}
									</p>
								</div>
								<div className='flex items-center gap-2'>
									{!l.signedAt && (
										<>
											<Button
												size='sm'
												onClick={() => {
													setLaterEmpSigned(false);
													setLaterAdminSigned(false);
													setSignTarget(l);
												}}
												disabled={isBusy}>
												<PenLine className='w-4 h-4 mr-1' /> Sign
											</Button>
											<Button size='sm' variant='ghost' className='text-red-600' onClick={() => handleDelete(l)} disabled={isBusy} title='Delete unsigned letter'>
												<Trash2 className='w-4 h-4' />
											</Button>
										</>
									)}
									<DownloadPdfButton getPdf={() => exportJointLetterPdf(l.id)} label='Letter PDF' />
								</div>
							</div>
						</Card>
					))}
				</div>
			)}

			{/* New letter */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>New joint letter for {employeeName}</DialogTitle>
						<DialogDescription>Pick a type to start from a template, then edit the text. The PDF is printed in English.</DialogDescription>
					</DialogHeader>

					<div className='space-y-4 py-2'>
						<div className='space-y-2'>
							<Label>Type of letter</Label>
							<div className='grid grid-cols-3 gap-2'>
								{Object.entries(JOINT_LETTER_TYPE_LABELS).map(([value, label]) => (
									<button
										key={value}
										type='button'
										disabled={isBusy}
										onClick={() => {
											setType(value);
											applyTemplate(value, penaltyId);
										}}
										className={cn("rounded-lg border-2 p-2.5 text-sm font-semibold transition-colors cursor-pointer", type === value ? "border-primary bg-primary/10" : "border-gray-200 hover:border-gray-300")}>
										{label}
									</button>
								))}
							</div>
						</div>

						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='space-y-1'>
								<Label>Related penalty (optional)</Label>
								<Select
									value={penaltyId}
									onValueChange={(v) => {
										setPenaltyId(v);
										if (type) applyTemplate(type, v);
									}}
									disabled={isBusy}>
									<SelectTrigger className='w-full'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={NO_PENALTY}>No linked penalty</SelectItem>
										{penalties.map((p) => (
											<SelectItem key={p.id} value={String(p.id)}>
												{describePenalty(p).slice(0, 70)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-1'>
								<Label htmlFor='letter-date'>Letter date</Label>
								<Input id='letter-date' type='date' value={letterDate} onChange={(e) => setLetterDate(e.target.value)} disabled={isBusy} />
							</div>
						</div>

						<div className='space-y-1'>
							<Label htmlFor='letter-subject'>Subject</Label>
							<Input id='letter-subject' value={subject} maxLength={MAX_SUBJECT} onChange={(e) => setSubject(e.target.value)} disabled={isBusy} />
						</div>
						<div className='space-y-1'>
							<Label htmlFor='letter-body'>Letter text</Label>
							<Textarea id='letter-body' value={body} maxLength={MAX_BODY} rows={9} onChange={(e) => setBody(e.target.value)} disabled={isBusy} />
							<p className='text-xs text-gray-500'>Replace the [bracketed] parts. {body.length}/{MAX_BODY}</p>
						</div>

						<label className='flex items-center gap-2 text-sm cursor-pointer'>
							<input type='checkbox' checked={signNow} onChange={(e) => {
								// re-showing the pads mounts them blank, so the signed flags must reset too
								setSignNow(e.target.checked);
								setEmpSigned(false);
								setAdminSigned(false);
							}} disabled={isBusy} className='h-4 w-4' />
							Sign now (the employee is here) — otherwise save and sign later
						</label>
						{signNow && (
							<>
								<SignaturePad ref={empPadRef} label={`Employee signature (${employeeName})`} onEmptyChange={(empty) => setEmpSigned(!empty)} disabled={isBusy} />
								<SignaturePad ref={adminPadRef} label='Admin signature' onEmptyChange={(empty) => setAdminSigned(!empty)} disabled={isBusy} />
							</>
						)}
					</div>

					<DialogFooter>
						<Button variant='outline' onClick={() => setCreateOpen(false)} disabled={isBusy}>
							Cancel
						</Button>
						<Button onClick={submitCreate} disabled={isBusy || !!createMissing}>
							{isBusy ? <Loading /> : createMissing ?? (signNow ? "Create & Sign" : "Save Unsigned")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Sign later */}
			<Dialog open={!!signTarget} onOpenChange={(open) => !open && setSignTarget(null)}>
				<DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>Sign joint letter</DialogTitle>
						<DialogDescription>{signTarget && `${JOINT_LETTER_TYPE_LABELS[signTarget.type]} — "${signTarget.subject}" (${signTarget.letterDate})`}</DialogDescription>
					</DialogHeader>
					<div className='space-y-4 py-2'>
						<SignaturePad ref={laterEmpRef} label={`Employee signature (${employeeName})`} onEmptyChange={(empty) => setLaterEmpSigned(!empty)} disabled={isBusy} />
						<SignaturePad ref={laterAdminRef} label='Admin signature' onEmptyChange={(empty) => setLaterAdminSigned(!empty)} disabled={isBusy} />
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setSignTarget(null)} disabled={isBusy}>
							Cancel
						</Button>
						<Button onClick={submitSign} disabled={isBusy || !laterEmpSigned || !laterAdminSigned}>
							{isBusy ? <Loading /> : "Confirm & Save Signatures"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
