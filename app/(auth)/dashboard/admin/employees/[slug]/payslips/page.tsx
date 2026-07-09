import React from "react";
import Link from "next/link";
import prismaClient from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Receipt, AlertTriangle } from "lucide-react";
import { computePayslip } from "@/lib/hr-payroll";
import { currentMonthDubai, shiftMonth, monthLabel } from "@/lib/hr-dates";

async function page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ month?: string }> }) {
	const slug = (await params).slug;
	const sp = await searchParams;
	const userId = Number(slug);
	const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonthDubai();

	const [profile, bonuses, penalties] = await Promise.all([
		prismaClient.employeeProfile.findUnique({ where: { userId } }),
		prismaClient.bonus.findMany({ where: { userId, month }, select: { amount: true, note: true } }),
		prismaClient.penalty.findMany({
			where: { userId, effectiveMonth: month },
			select: { type: true, amount: true, details: true, isAutomatic: true },
		}),
	]);

	const payslip = computePayslip({
		basicSalary: profile?.basicSalary ?? 0,
		allowances: profile?.allowances ?? 0,
		bonuses,
		penalties,
	});

	const infoPenalties = penalties.filter((p) => p.type !== "SALARY_DEDUCTION");

	return (
		<div className='space-y-4 max-w-3xl'>
			<div className='flex items-center justify-between flex-wrap gap-3'>
				<h2 className='text-lg font-semibold flex items-center gap-2'>
					<Receipt className='w-5 h-5 text-primary' /> Payslip — {monthLabel(month)}
				</h2>
				<div className='flex items-center gap-2'>
					<Button variant='outline' size='sm' asChild>
						<Link href={`?month=${shiftMonth(month, -1)}`}>
							<ChevronLeft className='w-4 h-4' />
						</Link>
					</Button>
					<Button variant='outline' size='sm' asChild>
						<Link href={`?month=${shiftMonth(month, 1)}`}>
							<ChevronRight className='w-4 h-4' />
						</Link>
					</Button>
				</div>
			</div>

			{!profile && (
				<div className='flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3'>
					<AlertTriangle className='w-4 h-4 mt-0.5 shrink-0' />
					<span>No HR profile — salary fields are 0. Set basic salary and allowances in the HR Profile tab.</span>
				</div>
			)}

			<Card className='p-6'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Item</TableHead>
							<TableHead className='text-right'>Amount (AED)</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{payslip.lines.map((line, i) => (
							<TableRow key={i}>
								<TableCell className={line.kind === "deduction" ? "text-red-700" : ""}>{line.label}</TableCell>
								<TableCell className={`text-right font-medium ${line.kind === "deduction" ? "text-red-700" : ""}`}>
									{line.kind === "deduction" ? "−" : ""}
									{line.amount.toFixed(2)}
								</TableCell>
							</TableRow>
						))}
						<TableRow className='border-t-2'>
							<TableCell className='font-semibold'>Gross (basic + allowances + bonuses)</TableCell>
							<TableCell className='text-right font-semibold'>{payslip.gross.toFixed(2)}</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className='font-semibold text-red-700'>Total deductions</TableCell>
							<TableCell className='text-right font-semibold text-red-700'>−{payslip.totalDeductions.toFixed(2)}</TableCell>
						</TableRow>
						<TableRow className='bg-green-50'>
							<TableCell className='font-bold text-green-800'>Net pay</TableCell>
							<TableCell className='text-right font-bold text-green-800 text-lg'>AED {payslip.net.toFixed(2)}</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</Card>

			{infoPenalties.length > 0 && (
				<Card className='p-4'>
					<p className='text-sm font-medium text-gray-700 mb-2'>Other penalties this month (do not affect net pay):</p>
					<ul className='text-sm text-gray-600 list-disc pl-5 space-y-1'>
						{infoPenalties.map((p, i) => (
							<li key={i}>
								{p.type === "LEAVE_SALARY_DEDUCTION" ? `Leave salary deduction${p.amount ? ` of AED ${p.amount.toFixed(2)}` : ""}` : "Ticket removal"}
								{p.details ? ` — ${p.details}` : ""}
							</li>
						))}
					</ul>
				</Card>
			)}
		</div>
	);
}

export default page;
