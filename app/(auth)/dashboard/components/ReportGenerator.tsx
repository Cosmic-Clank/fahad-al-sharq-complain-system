"use client";

import * as React from "react";
import { FileDown, FileText, Filter, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { ComplaintColumn, PreviewCriterion, ComplaintPreviewRow } from "./reportActions";
import { getUniqueOptions, previewComplaints } from "./reportActions";

type Criterion = PreviewCriterion;

const criterionLabel: Record<Criterion, string> = {
	customerName: "Customer Name",
	customerEmail: "Customer Email",
	customerPhone: "Customer Phone",
	customerAddress: "Customer Address",
	buildingName: "Building Name",
	apartmentNumber: "Apartment Number",
	area: "Area",
	createdAt: "Created At (Date Range)",
};

type Option = { value: string; label: string };

export default function ReportGenerator() {
	const [criterion, setCriterion] = React.useState<Criterion>("customerName");

	const [options, setOptions] = React.useState<Option[]>([]);
	const [selected, setSelected] = React.useState<Option | null>(null);
	const [comboOpen, setComboOpen] = React.useState(false);

	const [startDate, setStartDate] = React.useState<string>("");
	const [endDate, setEndDate] = React.useState<string>("");

	const [isPreviewing, setIsPreviewing] = React.useState(false);
	const [rows, setRows] = React.useState<ComplaintPreviewRow[] | null>(null);

	const [loadingOptions, startTransition] = React.useTransition();
	const [loadingPreview, startPreviewTransition] = React.useTransition();

	const isDateMode = criterion === "createdAt";
	const canGenerate = isDateMode ? Boolean(startDate && endDate) : Boolean(selected?.value);

	// Fetch unique options for selected column
	React.useEffect(() => {
		if (isDateMode) {
			setOptions([]);
			setSelected(null);
			return;
		}
		setSelected(null);
		setOptions([]);
		setRows(null);
		setIsPreviewing(false);

		startTransition(async () => {
			const data = await getUniqueOptions(criterion as ComplaintColumn);
			setOptions(data);
		});
	}, [criterion, isDateMode]);

	const handlePreview = () => {
		setRows(null);
		setIsPreviewing(true);

		startPreviewTransition(async () => {
			try {
				const data = await previewComplaints(isDateMode ? { criterion: "createdAt", startDate, endDate, limit: 100 } : { criterion: criterion as ComplaintColumn, value: selected!.value, limit: 100 });
				setRows(data);
			} catch (e) {
				console.error(e);
				setRows([]);
			}
		});
	};

	const handleDownloadPdf = () => {
		alert("PDF generation not implemented yet — hook this to a server action when ready.");
	};

	const formatDate = (iso: string) => new Date(iso).toLocaleString();

	return (
		<div className='mx-auto max-w-5xl p-6'>
			<Card className='shadow-sm'>
				<CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<CardTitle className='text-2xl'>Report Generator</CardTitle>
						<p className='text-sm text-muted-foreground'>Pick a column, choose a value (or date range), then preview or download.</p>
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
									setIsPreviewing(false);
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
									<SelectItem value='area'>{criterionLabel.area}</SelectItem>
									<SelectItem value='createdAt'>{criterionLabel.createdAt}</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Value selector (combobox) */}
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
																setIsPreviewing(false);
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
								<p className='text-xs text-muted-foreground'>
									Showing unique values from <b>{criterionLabel[criterion]}</b>.
								</p>
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
											setIsPreviewing(false);
											setRows(null);
										}}
										className='sm:max-w-xs'
									/>
									<Input
										type='date'
										value={endDate}
										onChange={(e) => {
											setEndDate(e.target.value);
											setIsPreviewing(false);
											setRows(null);
										}}
										className='sm:max-w-xs'
									/>
									<Button type='button' variant='secondary' className='gap-2' disabled={!startDate || !endDate || loadingPreview} onClick={handlePreview}>
										{loadingPreview ? <Loader2 className='h-4 w-4 animate-spin' /> : <Filter className='h-4 w-4' />}
										Preview
									</Button>
								</div>
								<p className='text-xs text-muted-foreground'>Pick a start and end date (inclusive).</p>
							</div>
						)}
					</div>

					{/* Actions */}
					<div className='mt-6 flex flex-wrap items-center gap-3'>
						<Button type='button' className='gap-2' disabled={!canGenerate || loadingPreview} onClick={handlePreview} variant='outline'>
							{loadingPreview ? <Loader2 className='h-4 w-4 animate-spin' /> : <FileText className='h-4 w-4' />}
							Generate Preview
						</Button>
						<Button type='button' className='gap-2' disabled={!canGenerate} onClick={handleDownloadPdf}>
							<FileDown className='h-4 w-4' />
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

					{/* Preview Table */}
					<div className='mt-6 rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Customer Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Phone</TableHead>
									<TableHead>Address</TableHead>
									<TableHead>Building</TableHead>
									<TableHead>Apt</TableHead>
									<TableHead>Area</TableHead>
									<TableHead>Created At</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{!isPreviewing ? (
									<TableRow>
										<TableCell colSpan={8} className='text-center text-muted-foreground'>
											No preview yet. Choose a criterion and value/date, then click <b>Preview</b>.
										</TableCell>
									</TableRow>
								) : loadingPreview ? (
									<TableRow>
										<TableCell colSpan={8} className='text-center'>
											<span className='inline-flex items-center gap-2 text-muted-foreground'>
												<Loader2 className='h-4 w-4 animate-spin' /> Loading preview…
											</span>
										</TableCell>
									</TableRow>
								) : rows && rows.length > 0 ? (
									rows.map((r) => (
										<TableRow key={r.id}>
											<TableCell className='font-medium'>{r.customerName}</TableCell>
											<TableCell>{r.customerEmail ?? "-"}</TableCell>
											<TableCell>{r.customerPhone}</TableCell>
											<TableCell>{r.customerAddress}</TableCell>
											<TableCell>{r.buildingName}</TableCell>
											<TableCell>{r.apartmentNumber ?? "-"}</TableCell>
											<TableCell>{r.area}</TableCell>
											<TableCell>{formatDate(r.createdAt)}</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={8} className='text-center text-muted-foreground'>
											No results found for the chosen filter.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
