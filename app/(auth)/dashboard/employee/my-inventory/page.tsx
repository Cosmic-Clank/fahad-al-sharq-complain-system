import React from "react";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PackageOpen, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function page() {
	const session = await auth();
	const employeeId = Number((session?.user as any)?.id);

	if (!employeeId) {
		return <div>Error: Could not get user information</div>;
	}

	const stock = await prismaClient.employeeInventory.findMany({
		where: { employeeId, quantity: { gt: 0 } },
		include: {
			inventory: {
				select: {
					itemName: true,
					itemCode: true,
					category: true,
					imageUrl: true,
					division: true,
				},
			},
		},
		orderBy: { updatedAt: "desc" },
	});

	return (
		<div className="p-4 space-y-4">
			{/* Header */}
			<div className="p-6 bg-white rounded-sm border-t-4 border-primary">
				<div className="flex items-center gap-2 mb-2">
					<PackageOpen className="h-6 w-6 text-primary" />
					<h1 className="text-3xl font-bold">My Stock</h1>
				</div>
				<p className="text-gray-600">Items currently in your possession</p>
			</div>

			{stock.length === 0 ? (
				<Card className="p-8 text-center">
					<Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
					<p className="text-gray-500 mb-2 font-medium">No items in your inventory</p>
					<p className="text-gray-400 text-sm mb-6">Request items from the inventory manager to stock up.</p>
					<Link href="/dashboard/employee/inventory/request">
						<Button variant="outline">Make a Request</Button>
					</Link>
				</Card>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{stock.map((item) => (
						<Card key={item.id} className="p-4 flex flex-col gap-3">
							{/* Image */}
							<div className="flex items-center justify-center h-24 bg-gray-50 rounded-md border overflow-hidden">
								{item.inventory.imageUrl ? (
									<Image
										src={item.inventory.imageUrl}
										alt={item.inventory.itemName}
										width={96}
										height={96}
										className="object-contain h-full w-full"
									/>
								) : (
									<Package className="h-10 w-10 text-gray-300" />
								)}
							</div>

							{/* Details */}
							<div className="space-y-1">
								<p className="font-semibold text-gray-800 leading-tight">{item.inventory.itemName}</p>
								{item.inventory.itemCode && (
									<p className="text-xs text-gray-400">{item.inventory.itemCode}</p>
								)}
								{item.inventory.category && (
									<p className="text-xs text-gray-500">{item.inventory.category}</p>
								)}
							</div>

							{/* Quantity badge */}
							<div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
								<span className="text-xs text-gray-500">In stock</span>
								<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-green-100 text-green-800">
									{item.quantity}
								</span>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

export default page;
