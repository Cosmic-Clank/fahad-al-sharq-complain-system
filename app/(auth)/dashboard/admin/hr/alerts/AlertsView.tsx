import React from "react";
import Link from "next/link";
import prismaClient from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BellRing, BookUser } from "lucide-react";
import { expiryLevel, todayYmdDubai, type ExpiryLevel } from "@/lib/hr-dates";
import { DOCUMENT_TYPE_LABELS, EXPIRY_LEVEL_LABELS, EXPIRY_LEVEL_STYLES } from "@/lib/hr-documents";

const LEVEL_ORDER: Record<ExpiryLevel, number> = { expired: 0, critical: 1, warning: 2, ok: 3 };

export default async function AlertsView({ employeesBase = "/dashboard/admin/employees" }: { employeesBase?: string }) {
	const today = todayYmdDubai();

	const [documents, pendingHandovers] = await Promise.all([
		prismaClient.employeeDocument.findMany({
			where: { expiryDate: { not: null } },
			select: {
				id: true,
				type: true,
				title: true,
				documentNumber: true,
				expiryDate: true,
				userId: true,
				user: { select: { fullName: true, username: true } },
			},
		}),
		prismaClient.passportHandover.count({ where: { status: "REQUESTED" } }),
	]);

	const rows = documents
		.map((doc) => ({ ...doc, level: expiryLevel(doc.expiryDate!, today) }))
		.filter((doc) => doc.level !== "ok")
		.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.expiryDate!.localeCompare(b.expiryDate!));

	const counts = {
		expired: rows.filter((r) => r.level === "expired").length,
		critical: rows.filter((r) => r.level === "critical").length,
		warning: rows.filter((r) => r.level === "warning").length,
	};

	return (
		<div className='p-4 space-y-4'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<BellRing className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>Document Alerts</h1>
				</div>
				<p className='text-gray-600 mt-1'>Documents expiring within 6 months (warning) or 3 months (critical), plus anything already expired.</p>
				<div className='mt-3 flex flex-wrap gap-2 text-sm'>
					<span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${EXPIRY_LEVEL_STYLES.expired}`}>Expired: {counts.expired}</span>
					<span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${EXPIRY_LEVEL_STYLES.critical}`}>Critical: {counts.critical}</span>
					<span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${EXPIRY_LEVEL_STYLES.warning}`}>Warning: {counts.warning}</span>
					{pendingHandovers > 0 && (
						<span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800'>
							<BookUser className='w-3 h-3' /> Pending passport requests: {pendingHandovers}
						</span>
					)}
				</div>
			</div>

			<Card className='p-6'>
				{rows.length === 0 ? (
					<p className='text-sm text-gray-500'>No documents need attention. 🎉</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Employee</TableHead>
								<TableHead>Document</TableHead>
								<TableHead>Number</TableHead>
								<TableHead>Expiry Date</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row) => (
								<TableRow key={row.id}>
									<TableCell>
										<Link href={`${employeesBase}/${row.userId}/documents`} className='text-primary hover:underline font-medium'>
											{row.user.fullName}
										</Link>
										<div className='text-xs text-gray-500'>@{row.user.username}</div>
									</TableCell>
									<TableCell>{row.type === "OTHER" && row.title ? row.title : DOCUMENT_TYPE_LABELS[row.type] ?? row.type}</TableCell>
									<TableCell className='text-sm text-gray-600'>{row.documentNumber ?? "—"}</TableCell>
									<TableCell className='font-medium'>{row.expiryDate}</TableCell>
									<TableCell>
										<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${EXPIRY_LEVEL_STYLES[row.level]}`}>{EXPIRY_LEVEL_LABELS[row.level]}</span>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</Card>
		</div>
	);
}
