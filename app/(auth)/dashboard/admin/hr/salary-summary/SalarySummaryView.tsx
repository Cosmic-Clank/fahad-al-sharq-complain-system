import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { currentMonthDubai, monthLabel, shiftMonth } from "@/lib/hr-dates";
import { getSalarySummary } from "@/lib/hr-salary-summary";
import DownloadPdfButton from "../components/DownloadPdfButton";
import { exportSalarySummaryPdf, exportSalarySummaryXlsx } from "../hrReportActions";

const aed = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Salary summary for every staff member in one month. Route access is enforced by the role layouts. */
export default async function SalarySummaryView({ month: monthParam, employeesBase }: { month?: string; employeesBase: string }) {
	const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonthDubai();
	const { rows, totals } = await getSalarySummary(month);
	const profileless = rows.filter((r) => !r.hasProfile);
	const isCurrentMonth = month === currentMonthDubai();

	return (
		<div className='p-4 space-y-4'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<Wallet className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>Salary Summary</h1>
				</div>
				<p className='text-gray-600 mt-1'>Every employee&apos;s salary for the month: basic + allowances + bonuses − salary deductions, with attendance days. Figures match each employee&apos;s Payslips tab.</p>
			</div>

			<div className='flex items-center justify-between flex-wrap gap-3'>
				<div className='flex items-center gap-2'>
					<Button variant='outline' size='sm' asChild>
						<Link href={`?month=${shiftMonth(month, -1)}`}>
							<ChevronLeft className='w-4 h-4' />
						</Link>
					</Button>
					<span className='text-lg font-semibold min-w-40 text-center'>{monthLabel(month)}</span>
					<Button variant='outline' size='sm' asChild>
						<Link href={`?month=${shiftMonth(month, 1)}`}>
							<ChevronRight className='w-4 h-4' />
						</Link>
					</Button>
				</div>
				<div className='flex items-center gap-2'>
					<DownloadPdfButton getPdf={exportSalarySummaryPdf.bind(null, month)} label='Export PDF' />
					<DownloadPdfButton getPdf={exportSalarySummaryXlsx.bind(null, month)} label='Export Excel' />
				</div>
			</div>

			{isCurrentMonth && (
				<p className='text-xs text-gray-500'>This month is still in progress — totals will change as bonuses, deductions and attendance are recorded.</p>
			)}

			{profileless.length > 0 && (
				<div className='flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3'>
					<AlertTriangle className='w-4 h-4 mt-0.5 shrink-0' />
					<span>No HR profile (salary shown as 0): {profileless.map((r) => r.fullName).join(", ")}. Set basic salary and allowances in the employee&apos;s HR Profile tab.</span>
				</div>
			)}

			<Card className='p-0 overflow-x-auto'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Employee</TableHead>
							<TableHead className='text-right'>Basic</TableHead>
							<TableHead className='text-right'>Allowances</TableHead>
							<TableHead className='text-right'>Bonuses</TableHead>
							<TableHead className='text-right'>Gross</TableHead>
							<TableHead className='text-right'>Deductions</TableHead>
							<TableHead className='text-right'>Net Pay (AED)</TableHead>
							<TableHead className='text-center'>Present</TableHead>
							<TableHead className='text-center'>Late</TableHead>
							<TableHead className='text-center'>Absent</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length === 0 && (
							<TableRow>
								<TableCell colSpan={10} className='text-center text-sm text-gray-500 py-6'>
									No employees found.
								</TableCell>
							</TableRow>
						)}
						{rows.map((row) => (
							<TableRow key={row.userId} className={row.hasProfile ? "" : "bg-amber-50/50"}>
								<TableCell>
									<Link href={`${employeesBase}/${row.userId}/payslips?month=${month}`} className='text-primary hover:underline font-medium'>
										{row.fullName}
									</Link>
									<div className='text-xs text-gray-500'>@{row.username}</div>
								</TableCell>
								<TableCell className='text-right'>{aed(row.basic)}</TableCell>
								<TableCell className='text-right'>{aed(row.allowances)}</TableCell>
								<TableCell className='text-right'>{aed(row.bonuses)}</TableCell>
								<TableCell className='text-right'>{aed(row.gross)}</TableCell>
								<TableCell className={`text-right ${row.deductions ? "text-red-700" : ""}`}>{row.deductions ? `−${aed(row.deductions)}` : aed(0)}</TableCell>
								<TableCell className='text-right font-semibold text-green-700'>{aed(row.net)}</TableCell>
								<TableCell className='text-center'>{row.present}</TableCell>
								<TableCell className='text-center'>{row.late}</TableCell>
								<TableCell className='text-center'>{row.absent}</TableCell>
							</TableRow>
						))}
					</TableBody>
					{rows.length > 0 && (
						<TableFooter>
							<TableRow className='font-bold'>
								<TableCell>Total ({rows.length} employees)</TableCell>
								<TableCell className='text-right'>{aed(totals.basic)}</TableCell>
								<TableCell className='text-right'>{aed(totals.allowances)}</TableCell>
								<TableCell className='text-right'>{aed(totals.bonuses)}</TableCell>
								<TableCell className='text-right'>{aed(totals.gross)}</TableCell>
								<TableCell className='text-right text-red-700'>{totals.deductions ? `−${aed(totals.deductions)}` : aed(0)}</TableCell>
								<TableCell className='text-right text-green-700'>{aed(totals.net)}</TableCell>
								<TableCell className='text-center'>{totals.present}</TableCell>
								<TableCell className='text-center'>{totals.late}</TableCell>
								<TableCell className='text-center'>{totals.absent}</TableCell>
							</TableRow>
						</TableFooter>
					)}
				</Table>
			</Card>
		</div>
	);
}
