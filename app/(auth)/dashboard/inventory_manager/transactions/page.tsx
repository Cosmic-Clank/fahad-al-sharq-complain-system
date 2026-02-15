import React from "react";
import prismaClient from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";

async function page() {
	const transactions = await prismaClient.inventoryTransaction.findMany({
		orderBy: {
			createdAt: "desc",
		},
		include: {
			inventory: {
				select: {
					id: true,
					itemName: true,
					itemCode: true,
				},
			},
			employee: {
				select: {
					id: true,
					fullName: true,
					username: true,
				},
			},
		},
	});

	const getTypeBadgeVariant = (type: string) => {
		switch (type) {
			case "ADD":
				return "default";
			case "REMOVE":
			case "REQUEST":
				return "destructive";
			default:
				return "secondary";
		}
	};

	const getSignedQty = (type: string, qty: number) => {
		if (type === "ADD") {
			return `+${qty}`;
		}

		if (type === "REMOVE" || type === "REQUEST") {
			return `-${qty}`;
		}

		return `${qty}`;
	};

	return (
		<div className='p-4 space-y-4'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<Package className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>All Transactions</h1>
				</div>
				<p className='text-gray-600'>Plain view of all inventory transactions</p>
			</div>

			<Card className='p-6'>
				{transactions.length === 0 ? (
					<p className='text-sm text-gray-500'>No transactions recorded.</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Item</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Qty</TableHead>
								<TableHead>Employee</TableHead>
								<TableHead>Notes</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{transactions.map((txn) => (
								<TableRow key={txn.id}>
									<TableCell>{txn.createdAt.toLocaleString()}</TableCell>
									<TableCell>
										<div className='font-medium'>{txn.inventory?.itemName || "Unknown item"}</div>
										{txn.inventory?.itemCode ? (
											<div className='text-xs text-gray-500'>{txn.inventory.itemCode}</div>
										) : null}
									</TableCell>
									<TableCell>
										<Badge variant={getTypeBadgeVariant(txn.transactionType)}>{txn.transactionType}</Badge>
									</TableCell>
									<TableCell className='font-medium'>
										{getSignedQty(txn.transactionType, txn.quantity)}
									</TableCell>
									<TableCell>
										{txn.employee ? (
											<div>
												<div className='text-sm'>{txn.employee.fullName}</div>
												<div className='text-xs text-gray-500'>@{txn.employee.username}</div>
											</div>
										) : (
											<span className='text-xs text-gray-500'>-</span>
										)}
									</TableCell>
									<TableCell className='text-sm text-gray-500'>
										{txn.notes || "-"}
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

export default page;
