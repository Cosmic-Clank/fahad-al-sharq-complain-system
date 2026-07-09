"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loading } from "@/components/ui/loading";
import { Gavel, Gift, Plus, Trash2, ExternalLink, Bot } from "lucide-react";
import { toast } from "sonner";
import { createPenalty, deletePenalty, createBonus, deleteBonus } from "../actions";
import { currentMonthDubai } from "@/lib/hr-dates";

export interface PenaltyRow {
	id: number;
	type: string;
	amount: number | null;
	details: string | null;
	note: string | null;
	decidedBy: string;
	effectiveMonth: string;
	isAutomatic: boolean;
	letterFileUrl: string | null;
	createdAt: string;
}

export interface BonusRow {
	id: number;
	amount: number;
	note: string | null;
	month: string;
	createdAt: string;
}

const PENALTY_TYPE_LABELS: Record<string, string> = {
	SALARY_DEDUCTION: "Salary deduction",
	LEAVE_SALARY_DEDUCTION: "Leave salary deduction",
	TICKET_REMOVAL: "Ticket removal",
};

export default function PenaltiesSection({ userId, penalties, bonuses }: { userId: number; penalties: PenaltyRow[]; bonuses: BonusRow[] }) {
	const router = useRouter();
	const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false);
	const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [letterFile, setLetterFile] = useState<File | null>(null);

	const [penaltyForm, setPenaltyForm] = useState({
		type: "SALARY_DEDUCTION",
		amount: "",
		details: "",
		note: "",
		decidedBy: "",
		effectiveMonth: currentMonthDubai(),
	});
	const [bonusForm, setBonusForm] = useState({ amount: "", note: "", month: currentMonthDubai() });

	const savePenalty = async () => {
		setIsSaving(true);
		try {
			const fd = new FormData();
			fd.append("userId", String(userId));
			fd.append("type", penaltyForm.type);
			fd.append("amount", penaltyForm.amount);
			fd.append("details", penaltyForm.details);
			fd.append("note", penaltyForm.note);
			fd.append("decidedBy", penaltyForm.decidedBy);
			fd.append("effectiveMonth", penaltyForm.effectiveMonth);
			if (letterFile) fd.append("letterFile", letterFile);

			const result = await createPenalty(fd);
			if (result.success) {
				toast.success(result.message);
				setPenaltyDialogOpen(false);
				setPenaltyForm({ type: "SALARY_DEDUCTION", amount: "", details: "", note: "", decidedBy: "", effectiveMonth: currentMonthDubai() });
				setLetterFile(null);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsSaving(false);
		}
	};

	const saveBonus = async () => {
		setIsSaving(true);
		try {
			const fd = new FormData();
			fd.append("userId", String(userId));
			fd.append("amount", bonusForm.amount);
			fd.append("note", bonusForm.note);
			fd.append("month", bonusForm.month);

			const result = await createBonus(fd);
			if (result.success) {
				toast.success(result.message);
				setBonusDialogOpen(false);
				setBonusForm({ amount: "", note: "", month: currentMonthDubai() });
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsSaving(false);
		}
	};

	const removePenalty = async (id: number) => {
		const result = await deletePenalty(id);
		result.success ? toast.success(result.message) : toast.error(result.message);
		if (result.success) router.refresh();
	};

	const removeBonus = async (id: number) => {
		const result = await deleteBonus(id);
		result.success ? toast.success(result.message) : toast.error(result.message);
		if (result.success) router.refresh();
	};

	return (
		<div className='space-y-8'>
			{/* Penalties */}
			<div className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h2 className='text-lg font-semibold flex items-center gap-2'>
						<Gavel className='w-5 h-5 text-primary' /> Penalties (Joint Letters)
					</h2>
					<Button onClick={() => setPenaltyDialogOpen(true)} size='sm'>
						<Plus className='w-4 h-4 mr-1' /> Record Penalty
					</Button>
				</div>

				{penalties.length === 0 ? (
					<Card className='p-8 text-center text-gray-500 text-sm'>No penalties recorded.</Card>
				) : (
					<div className='rounded-md border bg-white overflow-x-auto'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Month</TableHead>
									<TableHead>Decided By</TableHead>
									<TableHead>Details</TableHead>
									<TableHead>Letter</TableHead>
									<TableHead></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{penalties.map((p) => (
									<TableRow key={p.id}>
										<TableCell>
											<span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800'>
												{p.isAutomatic && <Bot className='w-3 h-3' />}
												{PENALTY_TYPE_LABELS[p.type] ?? p.type}
											</span>
										</TableCell>
										<TableCell className='font-medium'>{p.amount !== null ? `AED ${p.amount.toFixed(2)}` : "—"}</TableCell>
										<TableCell>{p.effectiveMonth}</TableCell>
										<TableCell className='text-sm'>{p.decidedBy}</TableCell>
										<TableCell className='text-sm text-gray-600 max-w-56'>
											<div className='truncate' title={`${p.details ?? ""}${p.note ? ` — ${p.note}` : ""}`}>
												{p.details ?? "—"}
												{p.note && <span className='text-gray-400'> — {p.note}</span>}
											</div>
										</TableCell>
										<TableCell>
											{p.letterFileUrl ? (
												<a href={p.letterFileUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-primary hover:underline'>
													<ExternalLink className='w-3 h-3' /> View
												</a>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell className='text-right'>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button variant='ghost' size='sm' className='text-red-600' title={p.isAutomatic ? "Automatic — edit the attendance reason instead" : "Delete penalty"}>
														<Trash2 className='w-3.5 h-3.5' />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>Delete penalty?</AlertDialogTitle>
														<AlertDialogDescription>
															{p.isAutomatic
																? "This deduction was created automatically from attendance (3 'Other' early leaves). It cannot be deleted here — change the attendance early-leave reasons instead."
																: "This will remove the penalty from the employee's record and payslip. This cannot be undone."}
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														{!p.isAutomatic && (
															<AlertDialogAction onClick={() => removePenalty(p.id)} className='bg-red-600 hover:bg-red-700'>
																Delete
															</AlertDialogAction>
														)}
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			{/* Bonuses */}
			<div className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h2 className='text-lg font-semibold flex items-center gap-2'>
						<Gift className='w-5 h-5 text-primary' /> Bonuses
					</h2>
					<Button onClick={() => setBonusDialogOpen(true)} size='sm' variant='outline'>
						<Plus className='w-4 h-4 mr-1' /> Add Bonus
					</Button>
				</div>

				{bonuses.length === 0 ? (
					<Card className='p-8 text-center text-gray-500 text-sm'>No bonuses recorded.</Card>
				) : (
					<div className='rounded-md border bg-white overflow-x-auto'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Amount</TableHead>
									<TableHead>Payslip Month</TableHead>
									<TableHead>Note</TableHead>
									<TableHead>Added On</TableHead>
									<TableHead></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{bonuses.map((b) => (
									<TableRow key={b.id}>
										<TableCell className='font-medium text-green-700'>AED {b.amount.toFixed(2)}</TableCell>
										<TableCell>{b.month}</TableCell>
										<TableCell className='text-sm text-gray-600'>{b.note ?? "—"}</TableCell>
										<TableCell className='text-sm text-gray-500'>{b.createdAt}</TableCell>
										<TableCell className='text-right'>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button variant='ghost' size='sm' className='text-red-600'>
														<Trash2 className='w-3.5 h-3.5' />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>Delete bonus?</AlertDialogTitle>
														<AlertDialogDescription>AED {b.amount.toFixed(2)} for {b.month}. It will disappear from that month&apos;s payslip.</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<AlertDialogAction onClick={() => removeBonus(b.id)} className='bg-red-600 hover:bg-red-700'>
															Delete
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			{/* Penalty dialog */}
			<Dialog open={penaltyDialogOpen} onOpenChange={setPenaltyDialogOpen}>
				<DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>Record Penalty</DialogTitle>
						<DialogDescription>Official note on a penalty (e.g. after coming back late from holiday). Attach the signed joint letter if available.</DialogDescription>
					</DialogHeader>

					<div className='space-y-3 py-2'>
						<div className='space-y-1'>
							<Label>Penalty Type</Label>
							<Select value={penaltyForm.type} onValueChange={(v) => setPenaltyForm({ ...penaltyForm, type: v })} disabled={isSaving}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='SALARY_DEDUCTION'>Salary deduction (reduces the payslip)</SelectItem>
									<SelectItem value='LEAVE_SALARY_DEDUCTION'>Leave salary deduction (reduces leave balance)</SelectItem>
									<SelectItem value='TICKET_REMOVAL'>Ticket removal</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{penaltyForm.type !== "TICKET_REMOVAL" && (
							<div className='space-y-1'>
								<Label htmlFor='pen-amount'>
									Amount (AED) <span className='text-red-500'>*</span>
								</Label>
								<Input id='pen-amount' type='number' min='0' step='0.01' value={penaltyForm.amount} onChange={(e) => setPenaltyForm({ ...penaltyForm, amount: e.target.value })} disabled={isSaving} />
							</div>
						)}

						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-1'>
								<Label htmlFor='pen-month'>Effective Month</Label>
								<Input id='pen-month' type='month' value={penaltyForm.effectiveMonth} onChange={(e) => setPenaltyForm({ ...penaltyForm, effectiveMonth: e.target.value })} disabled={isSaving} />
							</div>
							<div className='space-y-1'>
								<Label htmlFor='pen-decided'>
									Decided By <span className='text-red-500'>*</span>
								</Label>
								<Input id='pen-decided' value={penaltyForm.decidedBy} onChange={(e) => setPenaltyForm({ ...penaltyForm, decidedBy: e.target.value })} placeholder='Name of decision maker' disabled={isSaving} />
							</div>
						</div>

						<div className='space-y-1'>
							<Label htmlFor='pen-details'>Reason / Details</Label>
							<Input id='pen-details' value={penaltyForm.details} onChange={(e) => setPenaltyForm({ ...penaltyForm, details: e.target.value })} placeholder='e.g. Returned late from holiday' disabled={isSaving} />
						</div>

						<div className='space-y-1'>
							<Label htmlFor='pen-note'>Official Note</Label>
							<Textarea id='pen-note' value={penaltyForm.note} onChange={(e) => setPenaltyForm({ ...penaltyForm, note: e.target.value })} rows={2} disabled={isSaving} />
						</div>

						<div className='space-y-1'>
							<Label htmlFor='pen-letter'>Joint Letter (image or PDF, max 5MB)</Label>
							<Input id='pen-letter' type='file' accept='image/jpeg,image/png,application/pdf' onChange={(e) => setLetterFile(e.target.files?.[0] ?? null)} disabled={isSaving} />
						</div>
					</div>

					<DialogFooter>
						<Button variant='outline' onClick={() => setPenaltyDialogOpen(false)} disabled={isSaving}>
							Cancel
						</Button>
						<Button onClick={savePenalty} disabled={isSaving}>
							{isSaving ? (
								<>
									<Loading />
									Saving...
								</>
							) : (
								"Record Penalty"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Bonus dialog */}
			<Dialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>Add Bonus</DialogTitle>
						<DialogDescription>The bonus is added to the selected month&apos;s payslip.</DialogDescription>
					</DialogHeader>

					<div className='space-y-3 py-2'>
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-1'>
								<Label htmlFor='bonus-amount'>
									Amount (AED) <span className='text-red-500'>*</span>
								</Label>
								<Input id='bonus-amount' type='number' min='0' step='0.01' value={bonusForm.amount} onChange={(e) => setBonusForm({ ...bonusForm, amount: e.target.value })} disabled={isSaving} />
							</div>
							<div className='space-y-1'>
								<Label htmlFor='bonus-month'>Payslip Month</Label>
								<Input id='bonus-month' type='month' value={bonusForm.month} onChange={(e) => setBonusForm({ ...bonusForm, month: e.target.value })} disabled={isSaving} />
							</div>
						</div>
						<div className='space-y-1'>
							<Label htmlFor='bonus-note'>Note</Label>
							<Input id='bonus-note' value={bonusForm.note} onChange={(e) => setBonusForm({ ...bonusForm, note: e.target.value })} placeholder='e.g. Excellent performance' disabled={isSaving} />
						</div>
					</div>

					<DialogFooter>
						<Button variant='outline' onClick={() => setBonusDialogOpen(false)} disabled={isSaving}>
							Cancel
						</Button>
						<Button onClick={saveBonus} disabled={isSaving}>
							{isSaving ? (
								<>
									<Loading />
									Saving...
								</>
							) : (
								"Add Bonus"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
