// components/ReportGenerator.tsx
"use client";

import * as React from "react";
import { FileDown, ChevronsUpDown, Check, Loader2, Filter, X } from "lucide-react";
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

import type { ComplaintColumn, ComplaintPreviewRow } from "./reportActions";
import { getUniqueOptions, previewComplaints, generateComplaintsPdfByFilter, generateComplaintsPdfByDateRange } from "./reportActions";

type Criterion = "buildingName" | "customerPhone";
type Option = { value: string; label: string };

const criterionLabel: Record<Criterion, string> = {
	buildingName: "Building Name",
	customerPhone: "Customer Phone",
};

export default function ReportGenerator() {
	const [criterion, setCriterion] = React.useState<Criterion>("buildingName");

	// primary combobox
	const [options, setOptions] = React.useState<Option[]>([]);
	const [selected, setSelected] = React.useState<Option | null>(null);
	const [comboOpen, setComboOpen] = React.useState(false);

	// apartments (multi-select)
	const [apartments, setApartments] = React.useState<Option[]>([]);
	const [selectedApartments, setSelectedApartments] = React.useState<Option[]>([]);
	const [apartmentOpen, setApartmentOpen] = React.useState(false);

	// date range (optional when building flow)
	const [startDate, setStartDate] = React.useState("");
	const [endDate, setEndDate] = React.useState("");

	// preview state
	const [rows, setRows] = React.useState<ComplaintPreviewRow[] | null>(null);
	const [loadingOptions, startOptionsTransition] = React.useTransition();
	const [loadingPreview, startPreviewTransition] = React.useTransition();

	// download state
	const [downloading, startDownloadTransition] = React.useTransition();

	// enable rules
	const canPreview = criterion === "customerPhone" ? Boolean(selected?.value) : Boolean(selected?.value || selectedApartments.length > 0);

	const canDownload = canPreview;

	// fetch unique values when criterion changes
	React.useEffect(() => {
		setSelected(null);
		setOptions([]);
		setRows(null);
		setSelectedApartments([]);
		setApartments([]);
		setStartDate("");
		setEndDate("");

		startOptionsTransition(async () => {
			const data = await getUniqueOptions(criterion as ComplaintColumn);
			setOptions(data);
		});
	}, [criterion]);

	// fetch apartments when a building is selected (dedupe/normalize)
	React.useEffect(() => {
		if (criterion !== "buildingName" || !selected?.value) {
			setApartments([]);
			setSelectedApartments([]);
			return;
		}
		startOptionsTransition(async () => {
			const raw = await getUniqueOptions("apartmentNumber", { buildingName: selected.value });
			const seen = new Set<string>();
			const deduped: Option[] = [];
			for (const opt of raw) {
				const key = String(opt.value).trim().toUpperCase();
				if (!key) continue;
				if (seen.has(key)) continue;
				seen.add(key);
				deduped.push({ value: String(opt.value).trim(), label: String(opt.label).trim() });
			}
			setApartments(deduped);
		});
	}, [criterion, selected]);

	// PREVIEW
	const handlePreview = () => {
		if (!canPreview) return;
		setRows(null);

		startPreviewTransition(async () => {
			try {
				if (criterion === "customerPhone") {
					const data = await previewComplaints({
						criterion: "customerPhone",
						value: selected!.value,
						limit: 200,
					});
					setRows(data);
					return;
				}

				// Building flow — send all chosen filters together
				const payload: any = {
					criterion: "buildingName",
					value: selected?.value ?? "",
					limit: 200,
				};

				if (selectedApartments.length > 0) {
					payload.apartmentNumbers = selectedApartments.map((o) => o.value);
				}
				if (startDate && endDate) {
					payload.startDate = startDate;
					payload.endDate = endDate;
				}

				const data = await previewComplaints(payload);
				setRows(data);
			} catch (e) {
				console.error(e);
				setRows([]);
			}
		});
	};

	// DOWNLOAD
	const handleDownloadPdf = () => {
		if (!canDownload) return;

		startDownloadTransition(async () => {
			try {
				let result: { fileName: string; base64: string };

				if (criterion === "customerPhone") {
					result = await generateComplaintsPdfByFilter("customerPhone", selected!.value);
				} else {
					if (!selected?.value && selectedApartments.length === 0) {
						throw new Error("Choose a building or apartments first.");
					}

					// If a date range is provided, prefer date-range generator and AND extra filters on server
					if (startDate && endDate) {
						result = await generateComplaintsPdfByDateRange(startDate, endDate, 1000, {
							buildingName: selected?.value,
							apartmentNumbers: selectedApartments.map((o) => o.value),
						} as any);
					} else {
						// No dates → filter by building (and possibly apartments)
						if (selected?.value) {
							result = await generateComplaintsPdfByFilter("buildingName", selected.value, {
								apartmentNumbers: selectedApartments.map((o) => o.value),
							} as any);
						} else {
							// Only apartments chosen (rare)
							result = await generateComplaintsPdfByFilter("apartmentNumber", "__ANY__", {
								apartmentNumbers: selectedApartments.map((o) => o.value),
							} as any);
						}
					}
				}

				// Download
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
						<p className='text-sm text-muted-foreground'>
							Filter complaints by <b>Building → Apartment(s) → Date</b> or directly by <b>Customer Phone</b>.
						</p>
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
							<Select value={criterion} onValueChange={(v: Criterion) => setCriterion(v)}>
								<SelectTrigger>
									<SelectValue placeholder='Select criterion' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='buildingName'>{criterionLabel.buildingName}</SelectItem>
									<SelectItem value='customerPhone'>{criterionLabel.customerPhone}</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Building / Phone selector */}
						{criterion === "buildingName" && (
							<div className='space-y-2 md:col-span-2'>
								<Label>{criterionLabel.buildingName}</Label>

								<Popover open={comboOpen} onOpenChange={setComboOpen}>
									<PopoverTrigger asChild>
										<Button variant='outline' role='combobox' aria-expanded={comboOpen} className='w-full justify-between' disabled={loadingOptions}>
											{selected ? (
												<span className='flex items-center gap-2'>
													{selected.label}
													<X
														className='h-4 w-4 opacity-60 hover:opacity-100'
														onClick={(e) => {
															e.stopPropagation();
															setSelected(null);
															setSelectedApartments([]);
															setRows(null);
														}}
													/>
												</span>
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
											<CommandInput placeholder='Search Building...' />
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
							</div>
						)}

						{criterion === "customerPhone" && (
							<div className='space-y-2 md:col-span-2'>
								<Label>{criterionLabel.customerPhone}</Label>

								<Popover open={comboOpen} onOpenChange={setComboOpen}>
									<PopoverTrigger asChild>
										<Button variant='outline' role='combobox' aria-expanded={comboOpen} className='w-full justify-between' disabled={loadingOptions}>
											{selected ? (
												<span className='flex items-center gap-2'>
													{selected.label}
													<X
														className='h-4 w-4 opacity-60 hover:opacity-100'
														onClick={(e) => {
															e.stopPropagation();
															setSelected(null);
															setRows(null);
														}}
													/>
												</span>
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
											<CommandInput placeholder='Search Customer Phone...' />
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
							</div>
						)}
					</div>

					{/* Apartment + Date Range (only if building selected) */}
					{criterion === "buildingName" && selected && (
						<div className='mt-4 space-y-4'>
							{/* Apartments (multi-select) */}
							<div className='space-y-2'>
								<Label>Apartment(s)</Label>
								<Popover open={apartmentOpen} onOpenChange={setApartmentOpen}>
									<PopoverTrigger asChild>
										<Button variant='outline' role='combobox' aria-expanded={apartmentOpen} className='w-full justify-between' disabled={loadingOptions}>
											{selectedApartments.length > 0 ? `${selectedApartments.length} selected` : "Search & select"}
											<ChevronsUpDown className='ml-2 h-4 w-4 opacity-50' />
										</Button>
									</PopoverTrigger>
									<PopoverContent className='p-0 w-[--radix-popover-trigger-width] min-w-[280px]'>
										<Command>
											<CommandInput placeholder='Search Apartment...' />
											<CommandList>
												<CommandEmpty>No results.</CommandEmpty>
												<CommandGroup>
													{apartments.map((opt) => {
														const active = selectedApartments.some((o) => o.value === opt.value);
														return (
															<CommandItem
																key={opt.value}
																value={opt.label}
																onSelect={() => {
																	setSelectedApartments((prev) => {
																		const exists = prev.some((o) => o.value === opt.value);
																		return exists ? prev.filter((o) => o.value !== opt.value) : [...prev, opt];
																	});
																	setRows(null);
																}}>
																<Check className={cn("mr-2 h-4 w-4", active ? "opacity-100" : "opacity-0")} />
																{opt.label}
															</CommandItem>
														);
													})}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>

								{selectedApartments.length > 0 && (
									<div className='flex gap-2 flex-wrap mt-1'>
										{selectedApartments.map((a) => (
											<Badge key={a.value} variant='secondary' className='flex items-center gap-1'>
												{a.label}
												<X className='h-3 w-3 cursor-pointer opacity-70 hover:opacity-100' onClick={() => setSelectedApartments((prev) => prev.filter((p) => p.value !== a.value))} />
											</Badge>
										))}
										<Button variant='ghost' size='sm' className='h-7 px-2' onClick={() => setSelectedApartments([])}>
											Clear apartments
										</Button>
									</div>
								)}
							</div>

							{/* Date Range (optional) */}
							<div className='space-y-2'>
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
									<Button type='button' variant='secondary' className='gap-2' disabled={!canPreview || loadingPreview} onClick={handlePreview}>
										{loadingPreview ? <Loader2 className='h-4 w-4 animate-spin' /> : <Filter className='h-4 w-4' />}
										Preview
									</Button>
								</div>
							</div>
						</div>
					)}

					{/* Actions */}
					<div className='mt-6 flex flex-wrap items-center gap-3'>
						<Button type='button' className='gap-2' disabled={!canDownload || downloading} onClick={handleDownloadPdf}>
							{downloading ? <Loader2 className='h-4 w-4 animate-spin' /> : <FileDown className='h-4 w-4' />}
							Download PDF
						</Button>
					</div>

					{/* Preview table */}
					<div className='mt-6 rounded-md border overflow-x-auto'>
						<table className='w-full text-sm'>
							<thead className='bg-muted/50'>
								<tr className='[&>th]:text-left [&>th]:px-3 [&>th]:py-2'>
									<th>Customer Name</th>
									<th>Phone</th>
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
											<td>{r.customerPhone}</td>
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
