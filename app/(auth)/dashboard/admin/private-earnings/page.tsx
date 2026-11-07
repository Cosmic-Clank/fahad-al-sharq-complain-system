import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote } from "lucide-react";
import { withRole } from "@/lib/page-guard";
import { currentMonthDubai, monthLabel } from "@/lib/hr-dates";
import DownloadPdfButton from "../hr/components/DownloadPdfButton";
import { exportPrivateEarningsXlsx, getPrivateEarnings } from "./actions";

const aed = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_STYLE: Record<string, string> = {
	Completed: "bg-green-100 text-green-800",
	"In Progress": "bg-amber-100 text-amber-800",
	Incomplete: "bg-red-100 text-red-800",
};

async function PrivateEarningsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
	const sp = await searchParams;
	const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonthDubai();
	const report = await getPrivateEarnings(month);
	if (!report) return null;

	return (
		<div className='p-4 space-y-4'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<Banknote className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>Private Job Earnings</h1>
				</div>
				<p className='text-gray-600 mt-1'>
					What each private job was charged, by month. A job counts in the month it was completed (or filed, if not completed yet). Enter the amount on the private complaint&apos;s page.
				</p>
			</div>

			<Card className='p-4'>
				<form method='get' className='flex flex-wrap items-end gap-3'>
					<div className='space-y-1'>
						<label htmlFor='month' className='text-xs font-medium text-gray-600 block'>
							Month
						</label>
						<input id='month' name='month' type='month' defaultValue={month} className='h-9 rounded-md border border-input bg-white px-3 text-sm' />
					</div>
					<Button type='submit' size='sm'>
						Show
					</Button>
					<div className='ml-auto flex gap-2'>
						<DownloadPdfButton getPdf={exportPrivateEarningsXlsx.bind(null, month)} label={`Excel — ${monthLabel(month)}`} />
						<DownloadPdfButton getPdf={exportPrivateEarningsXlsx.bind(null, "all")} label='Excel — all jobs' />
					</div>
				</form>
			</Card>

			<div className='grid gap-3 sm:grid-cols-3'>
				<Card className='p-4'>
					<p className='text-xs text-gray-500'>Earned · {monthLabel(month)}</p>
					<p className='text-2xl font-bold text-green-700'>AED {aed(report.total)}</p>
				</Card>
				<Card className='p-4'>
					<p className='text-xs text-gray-500'>Jobs · {monthLabel(month)}</p>
					<p className='text-2xl font-bold'>{report.rows.length}</p>
					{report.missing > 0 && <p className='text-xs text-amber-700'>{report.missing} completed without an amount</p>}
				</Card>
				<Card className='p-4'>
					<p className='text-xs text-gray-500'>Earned · all time</p>
					<p className='text-2xl font-bold'>AED {aed(report.allTimeTotal)}</p>
				</Card>
			</div>

			<Card className='p-0 overflow-hidden'>
				<div className='px-4 py-3 bg-gray-50 border-b font-semibold'>Jobs in {monthLabel(month)}</div>
				{report.rows.length === 0 ? (
					<p className='p-6 text-center text-sm text-gray-500'>No private jobs in this month.</p>
				) : (
					<div className='overflow-x-auto'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Complaint</TableHead>
									<TableHead>Job Date</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Customer</TableHead>
									<TableHead>Building / Apt</TableHead>
									<TableHead className='text-right'>Charged (AED)</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{report.rows.map((r) => (
									<TableRow key={r.complaintId}>
										<TableCell>
											<Link href={`/dashboard/admin/complaint/${r.complaintId}`} className='font-medium text-primary hover:underline'>
												#{r.complaintId}
											</Link>
										</TableCell>
										<TableCell className='whitespace-nowrap'>{r.jobDate}</TableCell>
										<TableCell>
											<Badge className={`${STATUS_STYLE[r.status] ?? ""} hover:opacity-100`}>{r.status}</Badge>
										</TableCell>
										<TableCell>{r.customerName}</TableCell>
										<TableCell className='text-sm'>
											{r.buildingName} · {r.apartmentNumber}
										</TableCell>
										<TableCell className='text-right font-medium'>
											{r.charged !== null ? (
												aed(r.charged)
											) : (
												<Link href={`/dashboard/admin/complaint/${r.complaintId}`} className='text-xs text-amber-700 hover:underline'>
													Not entered
												</Link>
											)}
										</TableCell>
									</TableRow>
								))}
								<TableRow className='bg-gray-50'>
									<TableCell colSpan={5} className='font-semibold'>
										Total earned · {monthLabel(month)}
									</TableCell>
									<TableCell className='text-right font-bold text-green-700'>{aed(report.total)}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
				)}
			</Card>

			{report.months.length > 0 && (
				<Card className='p-0 overflow-hidden'>
					<div className='px-4 py-3 bg-gray-50 border-b font-semibold'>By month</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Month</TableHead>
								<TableHead className='text-right'>Jobs</TableHead>
								<TableHead className='text-right'>With amount</TableHead>
								<TableHead className='text-right'>Earned (AED)</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{report.months.map((m) => (
								<TableRow key={m.month} className={m.month === month ? "bg-primary/5" : undefined}>
									<TableCell>
										<Link href={`/dashboard/admin/private-earnings?month=${m.month}`} className='hover:underline'>
											{monthLabel(m.month)}
										</Link>
									</TableCell>
									<TableCell className='text-right'>{m.jobs}</TableCell>
									<TableCell className='text-right'>{m.charged}</TableCell>
									<TableCell className='text-right font-medium'>{aed(m.total)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			)}
		</div>
	);
}

export default withRole(["ADMIN"], PrivateEarningsPage);
