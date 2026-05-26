"use client";

import React, { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { getEmployeeInventoryForComplaint, addComplaintInventoryUsage } from "./actions";

type StockItem = {
	id: number;
	quantity: number;
	inventory: {
		id: number;
		itemName: string;
		itemCode: string | null;
		category: string | null;
		imageUrl: string | null;
	};
};

interface Props {
	complaintId: string;
	employeeId: number;
}

export default function ComplaintInventoryForm({ complaintId, employeeId }: Props) {
	const [stock, setStock] = useState<StockItem[]>([]);
	const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
	const [quantity, setQuantity] = useState<number>(1);
	const [notes, setNotes] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(true);

	useEffect(() => {
		getEmployeeInventoryForComplaint(employeeId)
			.then((data) => setStock(data as StockItem[]))
			.finally(() => setIsFetching(false));
	}, [employeeId]);

	const selectedItem = stock.find((s) => s.inventory.id === selectedInventoryId);
	const maxQty = selectedItem?.quantity ?? 1;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedInventoryId) {
			toast.error("Please select an item.");
			return;
		}
		if (quantity < 1 || quantity > maxQty) {
			toast.error(`Quantity must be between 1 and ${maxQty}.`);
			return;
		}
		setIsLoading(true);
		try {
			const result = await addComplaintInventoryUsage(
				Number(complaintId),
				employeeId,
				selectedInventoryId,
				quantity,
				notes.trim() || undefined
			);
			if (result.success) {
				toast.success(result.message);
				setSelectedInventoryId(null);
				setQuantity(1);
				setNotes("");
				// refresh stock
				const updated = await getEmployeeInventoryForComplaint(employeeId);
				setStock(updated as StockItem[]);
				window.location.reload();
			} else {
				toast.error(result.message);
			}
		} finally {
			setIsLoading(false);
		}
	};

	if (isFetching) {
		return (
			<div className="flex items-center gap-2 text-sm text-gray-500 py-2">
				<Loading /> Loading your inventory…
			</div>
		);
	}

	if (stock.length === 0) {
		return (
			<p className="text-sm text-gray-400 italic py-2">
				You have no items in your personal inventory to log.
			</p>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-3 mt-3">
			{/* Item selector */}
			<div className="space-y-1">
				<Label className="text-xs font-medium text-gray-600">Select Item</Label>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{stock.map((s) => (
						<button
							key={s.inventory.id}
							type="button"
							onClick={() => {
								setSelectedInventoryId(s.inventory.id);
								setQuantity(1);
							}}
							className={`flex items-center gap-2 px-3 py-2 rounded-md border text-left text-sm transition-colors ${
								selectedInventoryId === s.inventory.id
									? "border-primary bg-primary/5 font-medium"
									: "border-gray-200 hover:border-gray-300 bg-white"
							}`}
						>
							<Package className="w-4 h-4 text-gray-400 shrink-0" />
							<span className="truncate flex-1">{s.inventory.itemName}</span>
							<span className="text-xs text-gray-500 shrink-0">({s.quantity} left)</span>
						</button>
					))}
				</div>
			</div>

			{selectedItem && (
				<>
					{/* Quantity */}
					<div className="space-y-1">
						<Label htmlFor="inv-qty" className="text-xs font-medium text-gray-600">
							Quantity Used (max {maxQty})
						</Label>
						<Input
							id="inv-qty"
							type="number"
							min={1}
							max={maxQty}
							value={quantity}
							onChange={(e) => setQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value))))}
							className="w-32"
						/>
					</div>

					{/* Notes */}
					<div className="space-y-1">
						<Label htmlFor="inv-notes" className="text-xs font-medium text-gray-600">
							Notes (optional)
						</Label>
						<Input
							id="inv-notes"
							type="text"
							placeholder="e.g. replaced faulty unit in bedroom"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
						/>
					</div>

					<Button type="submit" size="sm" disabled={isLoading} className="text-white">
						{isLoading ? <><Loading /> Logging…</> : "Log Items Used"}
					</Button>
				</>
			)}
		</form>
	);
}
