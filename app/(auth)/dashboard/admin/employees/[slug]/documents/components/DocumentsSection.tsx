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
import { Loading } from "@/components/ui/loading";
import { FileText, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { saveEmployeeDocument, deleteEmployeeDocument } from "../actions";
import { DOCUMENT_TYPE_LABELS, EXPIRY_LEVEL_LABELS, EXPIRY_LEVEL_STYLES } from "@/lib/hr-documents";
import { expiryLevel } from "@/lib/hr-dates";

export interface DocumentRow {
	id: number;
	type: string;
	title: string | null;
	documentNumber: string | null;
	fileUrl: string | null;
	expiryDate: string | null;
	notes: string | null;
}

const EMPTY_FORM = { type: "PASSPORT", title: "", documentNumber: "", expiryDate: "", notes: "" };

export default function DocumentsSection({ userId, documents }: { userId: number; documents: DocumentRow[] }) {
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState({ ...EMPTY_FORM });
	const [file, setFile] = useState<File | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const openCreate = () => {
		setEditingId(null);
		setForm({ ...EMPTY_FORM });
		setFile(null);
		setDialogOpen(true);
	};

	const openEdit = (doc: DocumentRow) => {
		setEditingId(doc.id);
		setForm({
			type: doc.type,
			title: doc.title ?? "",
			documentNumber: doc.documentNumber ?? "",
			expiryDate: doc.expiryDate ?? "",
			notes: doc.notes ?? "",
		});
		setFile(null);
		setDialogOpen(true);
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const fd = new FormData();
			if (editingId) fd.append("id", String(editingId));
			fd.append("userId", String(userId));
			fd.append("type", form.type);
			fd.append("title", form.title);
			fd.append("documentNumber", form.documentNumber);
			fd.append("expiryDate", form.expiryDate);
			fd.append("notes", form.notes);
			if (file) fd.append("file", file);

			const result = await saveEmployeeDocument(fd);
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
		setIsDeleting(true);
		try {
			const result = await deleteEmployeeDocument(id);
			if (result.success) {
				toast.success(result.message);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<h2 className='text-lg font-semibold'>Documents</h2>
				<Button onClick={openCreate} size='sm'>
					<Plus className='w-4 h-4 mr-1' /> Add Document
				</Button>
			</div>

			{documents.length === 0 ? (
				<Card className='p-8 text-center text-gray-500 text-sm'>No documents recorded yet.</Card>
			) : (
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
					{documents.map((doc) => {
						const level = doc.expiryDate ? expiryLevel(doc.expiryDate) : null;
						return (
							<Card key={doc.id} className='p-4 space-y-3'>
								<div className='flex items-start justify-between gap-2'>
									<div className='flex items-center gap-2 min-w-0'>
										<FileText className='w-5 h-5 text-primary shrink-0' />
										<div className='min-w-0'>
											<p className='font-semibold truncate'>{doc.type === "OTHER" && doc.title ? doc.title : DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</p>
											{doc.documentNumber && <p className='text-xs text-gray-500 truncate'>№ {doc.documentNumber}</p>}
										</div>
									</div>
									{level && <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${EXPIRY_LEVEL_STYLES[level]}`}>{EXPIRY_LEVEL_LABELS[level]}</span>}
								</div>

								<div className='text-sm text-gray-600 space-y-1'>
									<p>
										<span className='font-medium'>Expiry:</span> {doc.expiryDate ?? "—"}
									</p>
									{doc.notes && <p className='text-xs text-gray-500'>{doc.notes}</p>}
								</div>

								<div className='flex items-center gap-2 pt-1 border-t'>
									{doc.fileUrl && (
										<a href={doc.fileUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-primary hover:underline'>
											<ExternalLink className='w-3 h-3' /> View file
										</a>
									)}
									<div className='flex-1' />
									<Button variant='ghost' size='sm' onClick={() => openEdit(doc)}>
										<Pencil className='w-3.5 h-3.5' />
									</Button>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button variant='ghost' size='sm' className='text-red-600' disabled={isDeleting}>
												<Trash2 className='w-3.5 h-3.5' />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Delete document?</AlertDialogTitle>
												<AlertDialogDescription>This will remove the document record{doc.fileUrl ? " (the uploaded file stays in storage)" : ""}. This cannot be undone.</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction onClick={() => handleDelete(doc.id)} className='bg-red-600 hover:bg-red-700'>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</Card>
						);
					})}
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className='max-w-lg'>
					<DialogHeader>
						<DialogTitle>{editingId ? "Edit Document" : "Add Document"}</DialogTitle>
						<DialogDescription>Expiry dates are typed manually — they are not read from the uploaded file.</DialogDescription>
					</DialogHeader>

					<div className='space-y-3 py-2'>
						<div className='space-y-1'>
							<Label>Type</Label>
							<Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={isSaving}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{form.type === "OTHER" && (
							<div className='space-y-1'>
								<Label htmlFor='doc-title'>
									Title <span className='text-red-500'>*</span>
								</Label>
								<Input id='doc-title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder='e.g. Driving license' disabled={isSaving} />
							</div>
						)}

						<div className='space-y-1'>
							<Label htmlFor='doc-number'>Document Number</Label>
							<Input id='doc-number' value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} disabled={isSaving} />
						</div>

						<div className='space-y-1'>
							<Label htmlFor='doc-expiry'>Expiry Date</Label>
							<Input id='doc-expiry' type='date' value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} disabled={isSaving} />
						</div>

						<div className='space-y-1'>
							<Label htmlFor='doc-file'>File (image or PDF, max 5MB)</Label>
							<Input id='doc-file' type='file' accept='image/jpeg,image/png,application/pdf' onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={isSaving} />
							{editingId && <p className='text-xs text-gray-500'>Leave empty to keep the current file.</p>}
						</div>

						<div className='space-y-1'>
							<Label htmlFor='doc-notes'>Notes</Label>
							<Textarea id='doc-notes' value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} disabled={isSaving} />
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
								"Add Document"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
