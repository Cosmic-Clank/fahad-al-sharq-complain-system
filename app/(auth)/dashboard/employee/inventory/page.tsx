import React from "react";
import { auth } from "@/auth";
import { getEmployeeInventoryRequests } from "../../components/inventory-request-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function page() {
	const session = await auth();
	const employeeId = (session?.user as any)?.id;

	if (!employeeId) {
		return <div>Error: Could not get user information</div>;
	}

	const requests = await getEmployeeInventoryRequests(employeeId);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "PENDING":
				return "bg-yellow-100 text-yellow-800";
			case "APPROVED":
				return "bg-green-100 text-green-800";
			case "REJECTED":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className='p-4 space-y-4'>
			{/* Header */}
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<Package className="h-6 w-6 text-primary" />
						<h1 className='text-3xl font-bold'>My Inventory Requests</h1>
					</div>
					<Link href="/dashboard/employee/inventory/request">
						<Button className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							New Request
						</Button>
					</Link>
				</div>
				<p className='text-gray-600'>View and manage your inventory requests</p>
			</div>

			{/* Request List */}
			{requests.length === 0 ? (
				<Card className='p-8 text-center'>
					<Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
					<p className='text-gray-500 mb-6'>No inventory requests yet</p>
					<Link href="/dashboard/employee/inventory/request">
						<Button size="lg" className="flex items-center gap-2 mx-auto">
							<Plus className="h-4 w-4" />
							Create Your First Request
						</Button>
					</Link>
				</Card>
			) : (
				<div className='space-y-3'>
					{requests.map((request: any) => (
						<Card key={request.id} className='p-6'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{/* Left Column */}
								<div className='space-y-2'>
									<div className='flex items-start gap-3'>
										{request.inventory.imageUrl ? (
											<div className='relative h-14 w-14 overflow-hidden rounded border bg-white'>
												<Image
													src={request.inventory.imageUrl}
													alt={request.inventory.itemName}
													fill
													sizes='56px'
													className='object-cover'
												/>
											</div>
										) : (
											<Package className='h-5 w-5 text-primary flex-shrink-0 mt-1' />
										)}
										<div>
											<h3 className='font-semibold text-lg'>{request.inventory.itemName}</h3>
											{request.inventory.itemCode && (
												<p className='text-sm text-gray-500'>{request.inventory.itemCode}</p>
											)}
										</div>
									</div>
									<div className='space-y-1 text-sm ml-7'>
										<p><span className='font-medium'>Quantity Requested:</span> {request.quantity} units</p>
										<p><span className='font-medium'>Reason:</span> {request.reason}</p>
										{request.notes && (
											<p><span className='font-medium'>Notes:</span> {request.notes}</p>
										)}
									</div>
								</div>

								{/* Right Column */}
								<div className='space-y-3'>
									<div>
										<p className='text-sm font-medium text-gray-600'>Status</p>
										<Badge className={`${getStatusColor(request.status)} mt-1`}>
											{request.status}
										</Badge>
									</div>
									<div>
										<p className='text-sm font-medium text-gray-600'>Created</p>
										<p className='text-sm'>{new Date(request.createdAt).toLocaleDateString()}</p>
									</div>
									{request.approvedAt && (
										<div>
											<p className='text-sm font-medium text-gray-600'>Approved By</p>
											<p className='text-sm'>{request.approver?.fullName}</p>
										</div>
									)}
								</div>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

export default page;
