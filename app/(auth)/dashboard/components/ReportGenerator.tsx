// components/ReportGenerator.tsx
"use client";

import * as React from "react";
import { FileDown, ChevronsUpDown, Check, Loader2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import type { ComplaintColumn, PreviewCriterion, ComplaintPreviewRow } from "./reportActions";
import { getUniqueOptions, previewComplaints, generateComplaintsPdfByFilter, generateComplaintsPdfByDateRange } from "./reportActions";

type Criterion = PreviewCriterion;
type Option = { value: string; label: string };

const criterionLabel: Record<Criterion, string> = {
	customerName: "Customer Name",
	customerEmail: "Customer Email",
	customerPhone: "Customer Phone",
	customerAddress: "Customer Address",
	buildingName: "Building Name",
	apartmentNumber: "Apartment Number",
	createdAt: "Created At (Date Range)",
};

export default function ReportGenerator() {
	const [criterion, setCriterion] = React.useState<Criterion>("customerName");

	// combobox options/state
	const [options, setOptions] = React.useState<Option[]>([]);
	const [selected, setSelected] = React.useState<Option | null>(null);
	const [comboOpen, setComboOpen] = React.useState(false);

	// date range
	const [startDate, setStartDate] = React.useState("");
	const [endDate, setEndDate] = React.useState("");

	// preview state
	const [rows, setRows] = React.useState<ComplaintPreviewRow[] | null>(null);
	const [loadingOptions, startOptionsTransition] = React.useTransition();
	const [loadingPreview, startPreviewTransition] = React.useTransition();

	// download state
	const [downloading, startDownloadTransition] = React.useTransition();

	const isDateMode = criterion === "createdAt";
	const canGenerate = isDateMode ? Boolean(startDate && endDate) : Boolean(selected?.value);

	// fetch uniques when non-date column chosen
	React.useEffect(() => {
		if (isDateMode) {
			setOptions([]);
			setSelected(null);
			setRows(null);
			return;
		}
		setSelected(null);
		setOptions([]);
		setRows(null);

		startOptionsTransition(async () => {
			const data = await getUniqueOptions(criterion as ComplaintColumn);
			setOptions(data);
		});
	}, [criterion, isDateMode]);

	const handlePreview = () => {
		if (!canGenerate) return;
		setRows(null);
		startPreviewTransition(async () => {
			try {
				const data = await previewComplaints(isDateMode ? { criterion: "createdAt", startDate, endDate, limit: 200 } : { criterion: criterion as ComplaintColumn, value: selected!.value, limit: 200 });
				setRows(data);
			} catch (e) {
				console.error(e);
				setRows([]);
			}
		});
	};

	const handleDownloadPdf = () => {
		if (!canGenerate) return;

		startDownloadTransition(async () => {
			try {
				let result: { fileName: string; base64: string };

				if (isDateMode) {
					if (!startDate || !endDate) {
						alert("Pick a start and end date first.");
						return;
					}

					// Optional: quick guard to ensure correct order
					const s = new Date(startDate);
					const e = new Date(endDate);
					if (isNaN(+s) || isNaN(+e)) {
						alert("Invalid date(s).");
						return;
					}
					if (s > e) {
						alert("Start date must be before end date.");
						return;
					}

					// 🔹 NEW: call the date-range generator
					result = await generateComplaintsPdfByDateRange(startDate, endDate, 1000);
				} else {
					if (!selected?.value) {
						alert("Pick a value to filter by first.");
						return;
					}

					// 🔹 Existing: call the column/value filter generator
					result = await generateComplaintsPdfByFilter(
						criterion as string, // column name
						selected.value // column value
					);
				}

				// ---- download (unchanged)
				const byteArray = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
				const blob = new Blob([byteArray], { type: "application/pdf" });

				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = result.fileName;
				document.body.appendChild(a);
				a.click();
				a.remove();
				URL.revokeObjectURL(url);
			} catch (e) {
				console.error(e);
				alert("Failed to generate PDF. Check server logs.");
			}
		});
	};

	const formatDateTime = (iso: string) =>
		new Date(iso).toLocaleString(undefined, {
			year: "numeric",
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});

	return (
		<div className='mx-auto max-w-5xl p-6'>
			<Card className='shadow-sm'>
				<CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<CardTitle className='text-2xl'>Report Generator</CardTitle>
						<p className='text-sm text-muted-foreground'>Pick a column & value (or a date range), preview matching complaints, or download a styled PDF (one complaint per page, images at bottom).</p>
					</div>
					<Badge variant='secondary' className='uppercase tracking-wide'>
						Complaints
					</Badge>
				</CardHeader>

				<Separator />

				<CardContent className='pt-6'>
					<div className='grid gap-5 md:grid-cols-3'>
						{/* Criterion */}
						<div className='space-y-2'>
							<Label>Report By</Label>
							<Select
								value={criterion}
								onValueChange={(v: Criterion) => {
									setCriterion(v);
									setSelected(null);
									setStartDate("");
									setEndDate("");
									setRows(null);
								}}>
								<SelectTrigger>
									<SelectValue placeholder='Select criterion' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='customerName'>{criterionLabel.customerName}</SelectItem>
									<SelectItem value='customerEmail'>{criterionLabel.customerEmail}</SelectItem>
									<SelectItem value='customerPhone'>{criterionLabel.customerPhone}</SelectItem>
									<SelectItem value='customerAddress'>{criterionLabel.customerAddress}</SelectItem>
									<SelectItem value='buildingName'>{criterionLabel.buildingName}</SelectItem>
									<SelectItem value='apartmentNumber'>{criterionLabel.apartmentNumber}</SelectItem>
									<SelectItem value='createdAt'>{criterionLabel.createdAt}</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Value selector / Date range */}
						{!isDateMode ? (
							<div className='space-y-2 md:col-span-2'>
								<Label>{criterionLabel[criterion]}</Label>

								<Popover open={comboOpen} onOpenChange={setComboOpen}>
									<PopoverTrigger asChild>
										<Button variant='outline' role='combobox' aria-expanded={comboOpen} className='w-full justify-between' disabled={loadingOptions}>
											{selected ? (
												selected.label
											) : loadingOptions ? (
												<span className='inline-flex items-center gap-2'>
													<Loader2 className='h-4 w-4 animate-spin' /> Loading…
												</span>
											) : (
												"Search & select"
											)}
											<ChevronsUpDown className='ml-2 h-4 w-4 opacity-50' />
										</Button>
									</PopoverTrigger>
									<PopoverContent className='p-0 w-[--radix-popover-trigger-width] min-w-[280px]'>
										<Command>
											<CommandInput placeholder={`Search ${criterionLabel[criterion]}...`} />
											<CommandList>
												<CommandEmpty>No results.</CommandEmpty>
												<CommandGroup>
													{options.map((opt) => (
														<CommandItem
															key={opt.value}
															value={opt.label}
															onSelect={() => {
																setSelected(opt);
																setComboOpen(false);
																setRows(null);
															}}>
															<Check className={cn("mr-2 h-4 w-4", selected?.value === opt.value ? "opacity-100" : "opacity-0")} />
															{opt.label}
														</CommandItem>
													))}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>

								<div className='flex gap-2'>
									<Button type='button' variant='secondary' className='gap-2' disabled={!selected || loadingPreview} onClick={handlePreview}>
										{loadingPreview ? <Loader2 className='h-4 w-4 animate-spin' /> : <Filter className='h-4 w-4' />}
										Preview
									</Button>
									{selected && (
										<Button
											type='button'
											variant='ghost'
											onClick={() => {
												setSelected(null);
												setRows(null);
											}}>
											Clear
										</Button>
									)}
								</div>
							</div>
						) : (
							<div className='space-y-2 md:col-span-2'>
								<Label>Date Range (Created At)</Label>
								<div className='flex flex-col gap-2 sm:flex-row'>
									<Input
										type='date'
										value={startDate}
										onChange={(e) => {
											setStartDate(e.target.value);
											setRows(null);
										}}
										className='sm:max-w-xs'
									/>
									<Input
										type='date'
										value={endDate}
										onChange={(e) => {
											setEndDate(e.target.value);
											setRows(null);
										}}
										className='sm:max-w-xs'
									/>
									<Button type='button' variant='secondary' className='gap-2' disabled={!startDate || !endDate || loadingPreview} onClick={handlePreview}>
										{loadingPreview ? <Loader2 className='h-4 w-4 animate-spin' /> : <Filter className='h-4 w-4' />}
										Preview
									</Button>
								</div>
							</div>
						)}
					</div>

					{/* Actions */}
					<div className='mt-6 flex flex-wrap items-center gap-3'>
						<Button type='button' className='gap-2' disabled={!canGenerate || downloading} onClick={handleDownloadPdf}>
							{downloading ? <Loader2 className='h-4 w-4 animate-spin' /> : <FileDown className='h-4 w-4' />}
							Download PDF
						</Button>

						{!isDateMode && selected && (
							<Badge variant='secondary' className='ml-auto'>
								{criterionLabel[criterion]}: {selected.label}
							</Badge>
						)}
						{isDateMode && startDate && endDate && (
							<Badge variant='secondary' className='ml-auto'>
								{startDate} → {endDate}
							</Badge>
						)}
					</div>

					{/* Preview table */}
					<div className='mt-6 rounded-md border overflow-x-auto'>
						<table className='w-full text-sm'>
							<thead className='bg-muted/50'>
								<tr className='[&>th]:text-left [&>th]:px-3 [&>th]:py-2'>
									<th>Customer Name</th>
									<th>Email</th>
									<th>Phone</th>
									<th>Address</th>
									<th>Building</th>
									<th>Apt</th>
									<th>Created At</th>
								</tr>
							</thead>
							<tbody className='[&>tr>td]:px-3 [&>tr>td]:py-2'>
								{loadingPreview ? (
									<tr>
										<td colSpan={8} className='text-center text-muted-foreground'>
											<span className='inline-flex items-center gap-2'>
												<Loader2 className='h-4 w-4 animate-spin' /> Loading…
											</span>
										</td>
									</tr>
								) : rows == null ? (
									<tr>
										<td colSpan={8} className='text-center text-muted-foreground'>
											No preview yet. Choose filters and click <b>Preview</b>.
										</td>
									</tr>
								) : rows.length === 0 ? (
									<tr>
										<td colSpan={8} className='text-center text-muted-foreground'>
											No results for the chosen filter.
										</td>
									</tr>
								) : (
									rows.map((r) => (
										<tr key={r.id} className='border-t'>
											<td className='font-medium'>{r.customerName}</td>
											<td>{r.customerEmail ?? "—"}</td>
											<td>{r.customerPhone}</td>
											<td>{r.customerAddress}</td>
											<td>{r.buildingName}</td>
											<td>{r.apartmentNumber ?? "—"}</td>
											<td>{formatDateTime(r.createdAt)}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
