import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Receipt } from "lucide-react";
import DownloadPdfButton from "@/app/(auth)/dashboard/admin/hr/components/DownloadPdfButton";
import { exportRestockCostsXlsx, getRestockCostReport, type RestockCostFilters } from "./restock-cost-actions";
import { formatQty } from "@/lib/inventory-units";
import { currentMonthDubai, daysInMonth, monthLabel } from "@/lib/hr-dates";
import { inventoryBasePath } from "@/lib/inventory-paths";

const aed = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function monthRange(month: string): { from: string; to: string } {
	const days = daysInMonth(month);
	return { from: days[0], to: days[days.length - 1] };
}

function previousMonth(month: string): string {
	const [y, m] = month.split("-").map(Number);
	return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/**
 * Shared server component: every restock with what it cost and a link to its bill,
 * with the total material cost. Rendered by the admin and inventory_manager routes.
 */
export default async function RestockCostsReport({ filters, role }: { filters: RestockCostFilters; role: "admin" | "inventory_manager" }) {
	const report = await getRestockCostReport(filters);
	const base = `${inventoryBasePath(role)}/restock-costs`;
	const thisMonth = monthRange(currentMonthDubai());
	const lastMonth = monthRange(previousMonth(currentMonthDubai()));
	const rangeLabel = filters.from || filters.to ? `${filters.from || "…"} to ${filters.to || "…"}` : "All time";

	return (
		<div className='p-4 space-y-4'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<Receipt className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>Restock Costs</h1>
				</div>
				<p className='text-gray-600 mt-1'>Every restock with what it cost and its bill, and the total spent on materials.</p>
			</div>

			{/* Filters (plain GET form) */}
			<Card className='p-4'>
				<form method='get' className='flex flex-wrap items-end gap-3'>
					<div className='space-y-1'>
						<label htmlFor='from' className='text-xs font-medium text-gray-600 block'>
							From
						</label>
						<input id='from' name='from' type='date' defaultValue={filters.from ?? ""} className='h-9 rounded-md border border-input bg-white px-3 text-sm' />
					</div>
					<div className='space-y-1'>
						<label htmlFor='to' className='text-xs font-medium text-gray-600 block'>
							To
						</label>
						<input id='to' name='to' type='date' defaultValue={filters.to ?? ""} className='h-9 rounded-md border border-input bg-white px-3 text-sm' />
					</div>
					<Button type='submit' size='sm'>
						Apply
					</Button>
					<div className='flex gap-2 text-sm'>
						<Link className='underline text-primary' href={`${base}?from=${thisMonth.from}&to=${thisMonth.to}`}>
							This month
						</Link>
						<Link className='underline text-primary' href={`${base}?from=${lastMonth.from}&to=${lastMonth.to}`}>
							Last month
						</Link>
						<Link className='underline text-primary' href={base}>
							All time
						</Link>
					</div>
					<div className='ml-auto'>
						<DownloadPdfButton getPdf={exportRestockCostsXlsx.bind(null, filters)} label='Export Excel' />
					</div>
				</form>
			</Card>

			{/* Summary */}
			<div className='grid gap-3 sm:grid-cols-3'>
				<Card className='p-4'>
					<p className='text-xs text-gray-500'>Total material cost · {rangeLabel}</p>
					<p className='text-2xl font-bold text-green-700'>AED {aed(report.totalCost)}</p>
				</Card>
				<Card className='p-4'>
					<p className='text-xs text-gray-500'>Restocks</p>
					<p className='text-2xl font-bold'>{report.rows.length}</p>
				</Card>
				<Card className='p-4'>
					<p className='text-xs text-gray-500'>Without a recorded cost</p>
					<p className='text-2xl font-bold'>{report.withoutCost}</p>
					{report.withoutCost > 0 && <p className='text-xs text-gray-500'>Made before cost and bill were required.</p>}
				</Card>
			</div>

			{report.rows.length === 0 ? (
				<Card className='p-8 text-center text-gray-500 text-sm'>No restocks in this period.</Card>
			) : (
				<>
					{/* Monthly totals */}
					{report.months.length > 1 && (
						<Card className='p-0 overflow-hidden'>
							<div className='px-4 py-3 bg-gray-50 border-b font-semibold'>By month</div>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Month</TableHead>
										<TableHead className='text-right'>Restocks</TableHead>
										<TableHead className='text-right'>Cost (AED)</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{report.months.map((m) => (
										<TableRow key={m.month}>
											<TableCell>{monthLabel(m.month)}</TableCell>
											<TableCell className='text-right'>{m.restocks}</TableCell>
											<TableCell className='text-right font-medium'>{aed(m.cost)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Card>
					)}

					{/* Every restock */}
					<Card className='p-0 overflow-hidden'>
						<div className='px-4 py-3 bg-gray-50 border-b font-semibold'>All restocks</div>
						<div className='overflow-x-auto'>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Item</TableHead>
										<TableHead className='text-right'>Quantity</TableHead>
										<TableHead className='text-right'>Cost (AED)</TableHead>
										<TableHead>Recorded By</TableHead>
										<TableHead>Bill</TableHead>
										<TableHead>Notes</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{report.rows.map((r) => (
										<TableRow key={r.id}>
											<TableCell className='whitespace-nowrap text-sm'>{r.date}</TableCell>
											<TableCell>
												<Link href={`${inventoryBasePath(role)}/item/${r.inventoryId}`} className='font-medium hover:underline'>
													{r.itemName}
												</Link>
												{r.itemCode && <span className='block text-xs text-gray-500'>{r.itemCode}</span>}
											</TableCell>
											<TableCell className='text-right whitespace-nowrap'>{formatQty(r.quantity, r.unit)}</TableCell>
											<TableCell className='text-right font-medium'>{r.cost !== null ? aed(r.cost) : <span className='text-gray-400'>—</span>}</TableCell>
											<TableCell className='text-sm'>{r.recordedBy ?? <span className='text-gray-400'>—</span>}</TableCell>
											<TableCell>
												{r.billUrl ? (
													<a href={r.billUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-sm text-primary hover:underline'>
														View <ExternalLink className='h-3.5 w-3.5' />
													</a>
												) : (
													<span className='text-xs text-gray-400'>{r.hasBill ? "Unavailable" : "None"}</span>
												)}
											</TableCell>
											<TableCell className='text-sm text-gray-600 max-w-64'>{r.notes ?? ""}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</Card>

					<Card className='p-4 flex items-center justify-between'>
						<span className='font-semibold'>Total material cost · {rangeLabel}</span>
						<span className='font-bold text-lg text-green-700'>AED {aed(report.totalCost)}</span>
					</Card>
				</>
			)}
		</div>
	);
}
