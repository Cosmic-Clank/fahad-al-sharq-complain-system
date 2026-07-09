import React from "react";
import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import type { LeaveSalaryResult } from "@/lib/hr-payroll";

export default function LeaveSalaryCard({ result }: { result: LeaveSalaryResult }) {
	return (
		<Card className='p-6 max-w-2xl space-y-3'>
			<h2 className='text-lg font-semibold flex items-center gap-2'>
				<Wallet className='w-5 h-5 text-primary' /> Leave Salary
			</h2>
			<div className='grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm'>
				<div>
					<p className='text-gray-500'>Accrued {result.isOverridden ? "(admin override)" : `(${result.completedYears} completed year${result.completedYears === 1 ? "" : "s"} × basic)`}</p>
					<p className='text-2xl font-semibold'>AED {result.accrued.toFixed(2)}</p>
				</div>
				<div>
					<p className='text-gray-500'>Leave-salary deductions</p>
					<p className='text-2xl font-semibold text-red-600'>− AED {result.deducted.toFixed(2)}</p>
				</div>
				<div>
					<p className='text-gray-500'>Balance</p>
					<p className='text-2xl font-bold text-green-700'>AED {result.balance.toFixed(2)}</p>
				</div>
			</div>
			<p className='text-xs text-gray-500'>Automatic rule: 1 month of basic salary per completed year of service. Set an override in the form above to replace the automatic amount.</p>
		</Card>
	);
}
