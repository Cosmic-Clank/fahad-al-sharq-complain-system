"use client";

import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestApprovalCard } from "./RequestApprovalCard";
import { Package, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface RequestFilterClientProps {
	allRequests: any[];
	approverId: number;
	pendingCount: number;
	approvedCount: number;
	rejectedCount: number;
}

export function RequestFilterClient({
	allRequests,
	approverId,
	pendingCount,
	approvedCount,
	rejectedCount,
}: RequestFilterClientProps) {
	const router = useRouter();
	const [selectedFilter, setSelectedFilter] = useState<"ALL" | string>("PENDING");

	const requests = useMemo(() => {
		if (selectedFilter === "ALL") {
			return allRequests;
		}

		return allRequests.filter((r) => r.status === selectedFilter);
	}, [allRequests, selectedFilter]);

	const handleFilterChange = (filter: "ALL" | string) => {
		setSelectedFilter(filter);
	};

	const handleApprovalChange = () => {
		router.refresh();
	};

	const filterButtons = [
		{ label: "All Requests", value: "ALL" as const, count: allRequests.length },
		{ label: "Pending", value: "PENDING" as const, count: pendingCount, icon: Clock },
		{ label: "Approved", value: "APPROVED" as const, count: approvedCount, icon: CheckCircle },
		{ label: "Rejected", value: "REJECTED" as const, count: rejectedCount, icon: XCircle },
	];

	return (
		<>
			{/* Filter Buttons */}
			<div className='flex gap-2 flex-wrap'>
				{filterButtons.map((btn) => {
					const Icon = btn.icon;
					return (
						<Button
							key={btn.value}
							variant={selectedFilter === btn.value ? "default" : "outline"}
							onClick={() => handleFilterChange(btn.value)}
							className="flex gap-2"
						>
							{Icon && <Icon className="h-4 w-4" />}
							{btn.label}
							<Badge variant="secondary" className="ml-1">
								{btn.count}
							</Badge>
						</Button>
					);
				})}
			</div>

			{/* Requests List */}
			{requests.length === 0 ? (
				<Card className='p-8 text-center'>
					<Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
					<p className='text-gray-500 mb-4'>
						{selectedFilter === "ALL"
							? "No inventory requests yet"
							: `No ${selectedFilter.toLowerCase()} requests`}
					</p>
				</Card>
			) : (
				<div className='space-y-3'>
					{requests.map((request) => (
						<RequestApprovalCard
							key={request.id}
							request={request}
							approverId={approverId}
							onApprovalChange={handleApprovalChange}
						/>
					))}
				</div>
			)}
		</>
	);
}
