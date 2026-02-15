"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Package, DollarSign, MapPin, Building2, Barcode, Tag, FileText, Calendar, ArrowLeft, Plus } from "lucide-react";
import { updateInventoryItem } from "./inventory-actions";
import { Loading } from "@/components/ui/loading";
import Image from "next/image";

interface InventoryItemData {
	id: string;
	itemName: string;
	itemCode: string;
	category: string;
	description: string;
	quantity: number;
	unitPrice: number | null;
	supplier: string;
	location: string;
	imageUrl: string | null;
	createdAt: string;
	updatedAt: string;
	transactions: {
		id: string;
		quantity: number;
		transactionType: string;
		notes: string;
		createdAt: string;
	}[];
}

interface InventoryItemCardProps {
	item: InventoryItemData;
	role?: string;
}

const InventoryItemCard: React.FC<InventoryItemCardProps> = ({ item, role = "inventory_manager" }) => {
	const router = useRouter();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Edit form state
	const [editedItem, setEditedItem] = useState({
		itemName: item.itemName,
		itemCode: item.itemCode,
		category: item.category,
		description: item.description,
		quantity: item.quantity,
		unitPrice: item.unitPrice || "",
		supplier: item.supplier,
		location: item.location,
	});

	const handleEditSubmit = async () => {
		setIsLoading(true);
		setError(null);

		const formData = new FormData();
		formData.append("id", item.id);
		formData.append("itemName", editedItem.itemName);
		formData.append("itemCode", editedItem.itemCode);
		formData.append("category", editedItem.category);
		formData.append("description", editedItem.description);
		formData.append("quantity", String(editedItem.quantity));
		formData.append("unitPrice", editedItem.unitPrice ? String(editedItem.unitPrice) : "");
		formData.append("supplier", editedItem.supplier);
		formData.append("location", editedItem.location);

		try {
			const result = await updateInventoryItem(formData);

			if (result.success) {
				setIsEditDialogOpen(false);
				router.refresh(); // Refresh the page to show updated data
			} else {
				setError(result.message);
			}
		} catch (err) {
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className='p-4 space-y-4'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<Button variant='outline' onClick={() => router.back()} className='flex items-center gap-2'>
					<ArrowLeft size={16} />
					Back
				</Button>
				<div className='flex items-center gap-2'>
					<Button variant='outline' onClick={() => router.push(`/dashboard/${role}/restock/${item.id}`)} className='flex items-center gap-2'>
						<Plus size={16} />
						Restock
					</Button>
					<Button onClick={() => setIsEditDialogOpen(true)} className='flex items-center gap-2'>
						<Pencil size={16} />
						Edit Item
					</Button>
				</div>
			</div>

			{/* Main Item Card */}
			<Card className='p-6'>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					{/* Left Column - Image */}
					<div>
						{item.imageUrl ? (
							<div className='w-full h-64 relative rounded-lg overflow-hidden border'>
								<Image src={item.imageUrl} alt={item.itemName} fill className='object-contain' />
							</div>
						) : (
							<div className='w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center'>
								<Package size={64} className='text-gray-400' />
							</div>
						)}
					</div>

					{/* Right Column - Details */}
					<div className='space-y-4'>
						<div>
							<h1 className='text-3xl font-bold'>{item.itemName}</h1>
							<p className='text-gray-500 text-sm mt-1'>Item ID: {item.id}</p>
						</div>

						<div className='grid grid-cols-2 gap-4'>
							<div>
								<Label className='text-gray-500 text-xs'>Quantity</Label>
								<div className='flex items-center gap-2 mt-1'>
									<Package size={18} className='text-blue-600' />
									<span className='text-2xl font-semibold'>{item.quantity}</span>
								</div>
							</div>
							{item.unitPrice && (
								<div>
									<Label className='text-gray-500 text-xs'>Unit Price</Label>
									<div className='flex items-center gap-2 mt-1'>
										<DollarSign size={18} className='text-green-600' />
										<span className='text-2xl font-semibold'>${item.unitPrice.toFixed(2)}</span>
									</div>
								</div>
							)}
						</div>

						<div className='space-y-2'>
							{item.itemCode && (
								<div className='flex items-center gap-2'>
									<Barcode size={16} className='text-gray-500' />
									<span className='text-sm'>
										<strong>Code:</strong> {item.itemCode}
									</span>
								</div>
							)}
							{item.category && (
								<div className='flex items-center gap-2'>
									<Tag size={16} className='text-gray-500' />
									<span className='text-sm'>
										<strong>Category:</strong> {item.category}
									</span>
								</div>
							)}
							{item.supplier && (
								<div className='flex items-center gap-2'>
									<Building2 size={16} className='text-gray-500' />
									<span className='text-sm'>
										<strong>Supplier:</strong> {item.supplier}
									</span>
								</div>
							)}
							{item.location && (
								<div className='flex items-center gap-2'>
									<MapPin size={16} className='text-gray-500' />
									<span className='text-sm'>
										<strong>Location:</strong> {item.location}
									</span>
								</div>
							)}
						</div>

						{item.description && (
							<div className='pt-4 border-t'>
								<Label className='text-gray-500 text-xs flex items-center gap-2'>
									<FileText size={14} />
									Description
								</Label>
								<p className='text-sm mt-2'>{item.description}</p>
							</div>
						)}

						<div className='pt-4 border-t text-xs text-gray-500 space-y-1'>
							<div className='flex items-center gap-2'>
								<Calendar size={12} />
								<span>Created: {item.createdAt}</span>
							</div>
							<div className='flex items-center gap-2'>
								<Calendar size={12} />
								<span>Last Updated: {item.updatedAt}</span>
							</div>
						</div>
					</div>
				</div>
			</Card>

			{/* Transaction History */}
			<Card className='p-6'>
				<h2 className='text-xl font-semibold mb-4'>Transaction History</h2>
				{item.transactions.length === 0 ? (
					<p className='text-gray-500 text-sm'>No transactions recorded.</p>
				) : (
					<div className='space-y-3'>
						{item.transactions.map((txn) => (
							<div key={txn.id} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg border'>
								<div className='flex items-center gap-3'>
									<Badge variant={txn.transactionType === "ADD" ? "default" : txn.transactionType === "REMOVE" ? "destructive" : "secondary"}>{txn.transactionType}</Badge>
									<div>
										<p className='font-medium'>
											{txn.transactionType === "ADD" ? "+" : txn.transactionType === "REMOVE" || txn.transactionType === "REQUEST" ? "-" : "±"}
											{txn.quantity} units
										</p>
										{txn.notes && <p className='text-sm text-gray-500'>{txn.notes}</p>}
									</div>
								</div>
								<span className='text-xs text-gray-500'>{txn.createdAt}</span>
							</div>
						))}
					</div>
				)}
			</Card>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>Edit Inventory Item</DialogTitle>
						<DialogDescription>Update the details of this inventory item.</DialogDescription>
					</DialogHeader>

					<div className='space-y-4 py-4'>
						<div>
							<Label htmlFor='itemName'>
								Item Name <span className='text-red-500'>*</span>
							</Label>
							<Input id='itemName' value={editedItem.itemName} onChange={(e) => setEditedItem({ ...editedItem, itemName: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='itemCode'>Item Code (Optional)</Label>
							<Input id='itemCode' value={editedItem.itemCode} onChange={(e) => setEditedItem({ ...editedItem, itemCode: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='category'>Category (Optional)</Label>
							<Input id='category' value={editedItem.category} onChange={(e) => setEditedItem({ ...editedItem, category: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='description'>Description (Optional)</Label>
							<Textarea id='description' value={editedItem.description} onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='quantity'>
								Quantity <span className='text-red-500'>*</span>
							</Label>
							<Input id='quantity' type='number' value={editedItem.quantity} onChange={(e) => setEditedItem({ ...editedItem, quantity: Number(e.target.value) })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='unitPrice'>Unit Price (Optional)</Label>
							<Input id='unitPrice' type='number' step='0.01' value={editedItem.unitPrice} onChange={(e) => setEditedItem({ ...editedItem, unitPrice: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='supplier'>Supplier (Optional)</Label>
							<Input id='supplier' value={editedItem.supplier} onChange={(e) => setEditedItem({ ...editedItem, supplier: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='location'>Location (Optional)</Label>
							<Input id='location' value={editedItem.location} onChange={(e) => setEditedItem({ ...editedItem, location: e.target.value })} disabled={isLoading} />
						</div>

						{error && <p className='text-red-500 text-sm bg-red-50 border border-red-200 rounded p-3'>{error}</p>}
					</div>

					<DialogFooter>
						<Button variant='outline' onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
							Cancel
						</Button>
						<Button onClick={handleEditSubmit} disabled={isLoading}>
							{isLoading ? (
								<>
									<Loading />
									Saving...
								</>
							) : (
								"Save Changes"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default InventoryItemCard;
