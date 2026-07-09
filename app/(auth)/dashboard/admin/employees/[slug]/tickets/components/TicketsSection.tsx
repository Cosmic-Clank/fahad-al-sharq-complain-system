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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loading } from "@/components/ui/loading";
import { Plane, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveAirlineTicket, deleteAirlineTicket } from "../actions";

export interface TicketRow {
	id: number;
	year: number;
	destination: string;
	value: number | null;
	notes: string | null;
}

export default function TicketsSection({ userId, nationality, tickets }: { userId: number; nationality: string | null; tickets: TicketRow[] }) {
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState({ year: String(new Date().getFullYear()), destination: "", value: "", notes: "" });
	const [isSaving, setIsSaving] = useState(false);

	const openCreate = () => {
		setEditingId(null);
		setForm({ year: String(new Date().getFullYear()), destination: "", value: "", notes: "" });
		setDialogOpen(true);
	};

	const openEdit = (t: TicketRow) => {
		setEditingId(t.id);
		setForm({ year: String(t.year), destination: t.destination, value: t.value === null ? "" : String(t.value), notes: t.notes ?? "" });
		setDialogOpen(true);
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const fd = new FormData();
			if (editingId) fd.append("id", String(editingId));
			fd.append("userId", String(userId));
			fd.append("year", form.year);
			fd.append("destination", form.destination);
			fd.append("value", form.value);
			fd.append("notes", form.notes);

			const result = await saveAirlineTicket(fd);
			if (result.success) {
				toast.success(result.message);
				setDialogOpen(false);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (id: number) => {
		const result = await deleteAirlineTicket(id);
		if (result.success) {
			toast.success(result.message);
			router.refresh();
		} else {
			toast.error(result.message);
		}
	};

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<div>
					<h2 className='text-lg font-semibold flex items-center gap-2'>
						<Plane className='w-5 h-5 text-primary' /> Airline Tickets
					</h2>
					<p className='text-sm text-gray-500'>
						Nationality: <span className='font-medium text-gray-700'>{nationality || "not set — add it in the HR Profile tab"}</span>
					</p>
				</div>
				<Button onClick={openCreate} size='sm'>
					<Plus className='w-4 h-4 mr-1' /> Add Ticket
				</Button>
			</div>

			{tickets.length === 0 ? (
				<Card className='p-8 text-center text-gray-500 text-sm'>No tickets recorded yet.</Card>
			) : (
				<div className='rounded-md border bg-white overflow-x-auto'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Year</TableHead>
								<TableHead>Destination</TableHead>
								<TableHead>Value</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tickets.map((t) => (
								<TableRow key={t.id}>
									<TableCell className='font-medium'>{t.year}</TableCell>
									<TableCell>{t.destination}</TableCell>
									<TableCell>{t.value !== null ? `AED ${t.value.toFixed(2)}` : "—"}</TableCell>
									<TableCell className='text-sm text-gray-600'>{t.notes ?? "—"}</TableCell>
									<TableCell className='text-right'>
										<Button variant='ghost' size='sm' onClick={() => openEdit(t)}>
											<Pencil className='w-3.5 h-3.5' />
										</Button>
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button variant='ghost' size='sm' className='text-red-600'>
													<Trash2 className='w-3.5 h-3.5' />
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Delete ticket?</AlertDialogTitle>
													<AlertDialogDescription>
														{t.year} → {t.destination}. This cannot be undone.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction onClick={() => handleDelete(t.id)} className='bg-red-600 hover:bg-red-700'>
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

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>{editingId ? "Edit Ticket" : "Add Ticket"}</DialogTitle>
						<DialogDescription>Record an airline ticket entitlement or purchase for this employee.</DialogDescription>
					</DialogHeader>

					<div className='space-y-3 py-2'>
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-1'>
								<Label htmlFor='ticket-year'>Year</Label>
								<Input id='ticket-year' type='number' min='2000' max='2100' value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} disabled={isSaving} />
							</div>
							<div className='space-y-1'>
								<Label htmlFor='ticket-value'>Value (AED)</Label>
								<Input id='ticket-value' type='number' min='0' step='0.01' value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} disabled={isSaving} />
							</div>
						</div>
						<div className='space-y-1'>
							<Label htmlFor='ticket-destination'>
								Destination <span className='text-red-500'>*</span>
							</Label>
							<Input id='ticket-destination' value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder='e.g. Karachi (PKR)' disabled={isSaving} />
						</div>
						<div className='space-y-1'>
							<Label htmlFor='ticket-notes'>Notes</Label>
							<Textarea id='ticket-notes' value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} disabled={isSaving} />
						</div>
					</div>

					<DialogFooter>
						<Button variant='outline' onClick={() => setDialogOpen(false)} disabled={isSaving}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={isSaving}>
							{isSaving ? (
								<>
									<Loading />
									Saving...
								</>
							) : editingId ? (
								"Save Changes"
							) : (
								"Add Ticket"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
