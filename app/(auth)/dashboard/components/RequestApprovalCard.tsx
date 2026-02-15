"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, CheckCircle, XCircle } from "lucide-react";
import { approveInventoryRequest, rejectInventoryRequest } from "./inventory-request-approval-actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";

interface RequestApprovalCardProps {
	request: any;
	approverId: number;
	onApprovalChange?: () => void;
}

export function RequestApprovalCard({ request, approverId, onApprovalChange }: RequestApprovalCardProps) {
	const [isApproving, setIsApproving] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);
	const [rejectionReason, setRejectionReason] = useState("");
	const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);

	const handleApprove = async () => {
		try {
			setIsApproving(true);
			await approveInventoryRequest(request.id, approverId);
			onApprovalChange?.();
		} catch (error) {
			console.error("Error approving request:", error);
			alert(`Error: ${(error as Error).message}`);
		} finally {
			setIsApproving(false);
		}
	};

	const handleReject = async () => {
		try {
			setIsRejecting(true);
			await rejectInventoryRequest(request.id, approverId, rejectionReason);
			setIsRejectionDialogOpen(false);
			setRejectionReason("");
			onApprovalChange?.();
		} catch (error) {
			console.error("Error rejecting request:", error);
			alert(`Error: ${(error as Error).message}`);
		} finally {
			setIsRejecting(false);
		}
	};

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

	const isPending = request.status === "PENDING";
	return (
		<Card className='p-6'>
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
				{/* Left Column - Item Info */}
				<div className='lg:col-span-1 space-y-3'>
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
						<p><span className='font-medium'>Item ID:</span> #{request.inventory.id}</p>
						<p><span className='font-medium'>Category:</span> {request.inventory.category || "N/A"}</p>
						<p><span className='font-medium'>Available Qty:</span> <span className='font-semibold text-blue-600'>{request.inventory.quantity} units</span></p>
					</div>
				</div>

				{/* Middle Column - Request Details */}
				<div className='lg:col-span-1 space-y-3'>
					<div>
						<p className='text-sm font-medium text-gray-600'>Requested By</p>
						<p className='mt-1 font-medium'>{request.employee.fullName}</p>
						<p className='text-sm text-gray-500'>@{request.employee.username}</p>
					</div>
					<div>
						<p className='text-sm font-medium text-gray-600'>Quantity Requested</p>
						<p className='mt-1 text-2xl font-bold text-primary'>{request.quantity} units</p>
					</div>
					<div>
						<p className='text-sm font-medium text-gray-600'>Reason</p>
						<p className='mt-1 text-sm'>{request.reason}</p>
					</div>
					{request.notes && !request.notes.startsWith("REJECTION:") && (
						<div>
							<p className='text-sm font-medium text-gray-600'>Notes</p>
							<p className='mt-1 text-sm'>{request.notes}</p>
						</div>
					)}
				</div>

				{/* Right Column - Status & Actions */}
				<div className='lg:col-span-1 space-y-4'>
					<div>
						<p className='text-sm font-medium text-gray-600 mb-2'>Status</p>
						<Badge className={`${getStatusColor(request.status)}`}>
							{request.status}
						</Badge>
					</div>

					{request.approvedBy && request.approver && (
						<div>
							<p className='text-sm font-medium text-gray-600 mb-1'>Reviewed By</p>
							<p className='font-medium text-sm'>{request.approver.fullName}</p>
							<p className='text-xs text-gray-500'>@{request.approver.username}</p>
							{request.approvedAt && (
								<p className='text-xs text-gray-500 mt-1'>{new Date(request.approvedAt).toLocaleString()}</p>
							)}
						</div>
					)}

					{request.notes?.startsWith("REJECTION:") && (
						<div className='bg-red-50 border border-red-200 rounded p-3'>
							<p className='text-sm font-medium text-red-800'>Rejection Reason</p>
							<p className='text-sm text-red-700 mt-1'>{request.notes.replace("REJECTION: ", "")}</p>
						</div>
					)}

					<div>
						<p className='text-xs text-gray-500 mb-2'>
							Requested on {new Date(request.createdAt).toLocaleDateString()}
						</p>
					</div>

					{/* Action Buttons */}
					{isPending && (
						<div className='flex gap-2 pt-2'>
							<Button
								size='sm'
								className='flex-1 bg-green-600 hover:bg-green-700'
								onClick={handleApprove}
								disabled={isApproving}
							>
								<CheckCircle className='h-4 w-4 mr-1' />
								{isApproving ? "Approving..." : "Approve"}
							</Button>
							<Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
								<DialogTrigger asChild>
									<Button size='sm' variant='destructive' className='flex-1'>
										<XCircle className='h-4 w-4 mr-1' />
										Reject
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Reject Request</DialogTitle>
										<DialogDescription>
											Rejection request from {request.employee.fullName} for {request.inventory.itemName}
										</DialogDescription>
									</DialogHeader>
									<div className='space-y-4 py-4'>
										<div>
											<p className='text-sm font-medium mb-2'>Rejection Reason (Optional)</p>
											<Textarea
												placeholder='Enter the reason for rejection...'
												value={rejectionReason}
												onChange={(e) => setRejectionReason(e.target.value)}
												className='min-h-[100px]'
											/>
										</div>
										<div className='flex gap-2 justify-end'>
											<Button
												variant='outline'
												onClick={() => setIsRejectionDialogOpen(false)}
											>
												Cancel
											</Button>
											<Button
												variant='destructive'
												onClick={handleReject}
												disabled={isRejecting}
											>
												{isRejecting ? "Rejecting..." : "Confirm Rejection"}
											</Button>
										</div>
									</div>
								</DialogContent>
							</Dialog>
						</div>
					)}

				</div>
			</div>
		</Card>
	);
}
