import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2 } from "lucide-react";
import { getUsageByBuilding, getUsageBuildingNames, exportUsageByBuildingXlsx, exportUsageByBuildingPdf, type UsageReportFilters } from "./inventory-report-actions";
import DownloadPdfButton from "@/app/(auth)/dashboard/admin/hr/components/DownloadPdfButton";
import { formatQty } from "@/lib/inventory-units";
import { round2 } from "@/lib/hr-payroll";

/**
 * Shared server component: which inventory was used on which building,
 * aggregated from complaint inventory usage logs. Rendered by both the
 * admin and inventory_manager routes.
 */
export default async function UsageByBuildingReport({ filters }: { filters: UsageReportFilters }) {
	const [rows, buildingNames] = await Promise.all([getUsageByBuilding(filters), getUsageBuildingNames()]);

	// Group rows per building for display
	const byBuilding = new Map<string, typeof rows>();
	for (const row of rows) {
		if (!byBuilding.has(row.buildingName)) byBuilding.set(row.buildingName, []);
		byBuilding.get(row.buildingName)!.push(row);
	}

	const grandCost = round2(rows.reduce((s, r) => s + (r.estimatedCost ?? 0), 0));

	return (
		<div className='p-4 space-y-4'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<Building2 className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>Usage by Building</h1>
				</div>
				<p className='text-gray-600 mt-1'>Materials used on complaints, grouped by building. Quantities come from the inventory usage employees log on each job.</p>
			</div>

			{/* Filters (plain GET form — no client JS needed) */}
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
					<div className='space-y-1'>
						<label htmlFor='building' className='text-xs font-medium text-gray-600 block'>
							Building
						</label>
						<select id='building' name='building' defaultValue={filters.building ?? ""} className='h-9 rounded-md border border-input bg-white px-3 text-sm min-w-48'>
							<option value=''>All buildings</option>
							{buildingNames.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
					</div>
					<Button type='submit' size='sm'>
						Apply
					</Button>
					<div className='ml-auto flex gap-2'>
						<DownloadPdfButton getPdf={exportUsageByBuildingPdf.bind(null, filters)} label='Detailed PDF' />
						<DownloadPdfButton getPdf={exportUsageByBuildingXlsx.bind(null, filters)} label='Export Excel' />
					</div>
				</form>
			</Card>

			{rows.length === 0 ? (
				<Card className='p-8 text-center text-gray-500 text-sm'>No inventory usage recorded for the selected filters.</Card>
			) : (
				<>
					{[...byBuilding.entries()].map(([building, items]) => {
						const buildingCost = round2(items.reduce((s, r) => s + (r.estimatedCost ?? 0), 0));
						return (
							<Card key={building} className='p-0 overflow-hidden'>
								<div className='px-4 py-3 bg-gray-50 border-b flex items-center justify-between flex-wrap gap-2'>
									<h2 className='font-semibold flex items-center gap-2'>
										<Building2 className='w-4 h-4 text-primary' />
										{building}
									</h2>
									<span className='text-sm text-gray-500'>
										{items.length} item{items.length === 1 ? "" : "s"} · est. cost AED {buildingCost.toFixed(2)}
									</span>
								</div>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Item</TableHead>
											<TableHead>Code</TableHead>
											<TableHead>Category</TableHead>
											<TableHead className='text-right'>Quantity Used</TableHead>
											<TableHead className='text-right'>Times Used</TableHead>
											<TableHead className='text-right'>Est. Cost (AED)</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{items.map((row, i) => (
											<TableRow key={i}>
												<TableCell className='font-medium'>{row.itemName}</TableCell>
												<TableCell className='text-sm text-gray-500'>{row.itemCode ?? "—"}</TableCell>
												<TableCell className='text-sm text-gray-500'>{row.category ?? "—"}</TableCell>
												<TableCell className='text-right font-medium'>{formatQty(row.totalQuantity, row.unit)}</TableCell>
												<TableCell className='text-right'>{row.timesUsed}</TableCell>
												<TableCell className='text-right'>{row.estimatedCost !== null ? row.estimatedCost.toFixed(2) : "—"}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</Card>
						);
					})}
					<Card className='p-4 flex items-center justify-between'>
						<span className='font-semibold'>Total estimated cost (all shown buildings)</span>
						<span className='font-bold text-lg text-green-700'>AED {grandCost.toFixed(2)}</span>
					</Card>
				</>
			)}
		</div>
	);
}
