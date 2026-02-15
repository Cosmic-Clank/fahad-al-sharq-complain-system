import React from "react";
import { auth } from "@/auth";
import { getAllInventoryRequests } from "../../../components/inventory-request-approval-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestApprovalCard } from "../../../components/RequestApprovalCard";
import { Package, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RequestFilterClient } from "../../../components/RequestFilterClient";

async function page() {
	const session = await auth();
	const approverId = Number((session?.user as any)?.id);

	if (!approverId) {
		return <div>Error: Could not get user information</div>;
	}

	// Fetch all requests (unfiltered) initially
	const allRequests = await getAllInventoryRequests();

	const pendingRequests = allRequests.filter((r: any) => r.status === "PENDING");
	const approvedRequests = allRequests.filter((r: any) => r.status === "APPROVED");
	const rejectedRequests = allRequests.filter((r: any) => r.status === "REJECTED");

	return (
		<div className='p-4 space-y-4'>
			{/* Header */}
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<Package className="h-6 w-6 text-primary" />
						<h1 className='text-3xl font-bold'>Inventory Requests</h1>
					</div>
				</div>
				<p className='text-gray-600'>Review and approve employee inventory requests</p>
			</div>

			{/* Content */}
			<RequestFilterClient
				allRequests={allRequests}
				approverId={approverId}
				pendingCount={pendingRequests.length}
				approvedCount={approvedRequests.length}
				rejectedCount={rejectedRequests.length}
			/>
		</div>
	);
}

export default page;

