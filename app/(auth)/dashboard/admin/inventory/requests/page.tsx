import React from "react";
import { auth } from "@/auth";
import { getAllInventoryRequests } from "../../../components/inventory-request-approval-actions";
import { Card } from "@/components/ui/card";
import { RequestFilterClient } from "../../../components/RequestFilterClient";
import { Package } from "lucide-react";

async function page() {
	const session = await auth();
	const approverId = Number((session?.user as any)?.id);

	if (!approverId) {
		return <div>Error: Could not get user information</div>;
	}

	const allRequests = await getAllInventoryRequests();
	const pendingRequests = allRequests.filter((r: any) => r.status === "PENDING");
	const approvedRequests = allRequests.filter((r: any) => r.status === "APPROVED");
	const rejectedRequests = allRequests.filter((r: any) => r.status === "REJECTED");

	return (
		<div className='p-4 space-y-4'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<Package className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>Inventory Requests</h1>
				</div>
				<p className='text-gray-600'>Review and approve employee inventory requests</p>
			</div>

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
