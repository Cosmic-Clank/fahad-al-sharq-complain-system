"use client";

import { translateMessage } from "@/lib/messages-ar";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Package, Banknote, MapPin, Building2, Barcode, Tag, FileText, Calendar, ArrowLeft, Plus, Globe, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/lib/notify";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateInventoryItem, deleteInventoryItem } from "./inventory-actions";
import { Loading } from "@/components/ui/loading";
import Image from "next/image";
import { UNIT_OPTIONS, formatQty, qtyStep, unitLabel } from "@/lib/inventory-units";
import { inventoryBasePath } from "@/lib/inventory-paths";
import { inventoryItemSchema, INVENTORY_IMAGE_TYPES, INVENTORY_ITEM_MESSAGES, MAX_INVENTORY_IMAGE_BYTES } from "@/lib/inventory-item-schema";

interface InventoryItemData {
	id: string;
	itemName: string;
	itemCode: string;
	category: string;
	description: string;
	quantity: number;
	unit: string;
	unitPrice: number | null;
	supplier: string;
	location: string;
	division: string;
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
	const [newImage, setNewImage] = useState<File | null>(null);

	// Edit form state — rebuilt from the item each time the dialog opens, so it never edits stale values
	const formFromItem = () => ({
		itemName: item.itemName,
		itemCode: item.itemCode,
		category: item.category,
		description: item.description,
		quantity: String(item.quantity),
		unit: item.unit,
		unitPrice: item.unitPrice || "",
		supplier: item.supplier,
		location: item.location,
		division: item.division,
	});
	const [editedItem, setEditedItem] = useState(formFromItem);

	const openEditDialog = () => {
		setEditedItem(formFromItem());
		setNewImage(null);
		setError(null);
		setIsEditDialogOpen(true);
	};

	const handleDelete = async () => {
		setIsLoading(true);
		try {
			const result = await deleteInventoryItem(Number(item.id));
			if (result.success) {
				toast.success(result.message);
				router.push(inventoryBasePath(role));
			} else {
				toast.error(result.message);
			}
		} catch (err) {
			toast.error("Something went wrong. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] ?? null;
		if (file && (!INVENTORY_IMAGE_TYPES.includes(file.type) || file.size > MAX_INVENTORY_IMAGE_BYTES)) {
			setError(translateMessage("Invalid file. Max size is 5MB, supported types are JPEG, PNG."));
			e.target.value = "";
			setNewImage(null);
			return;
		}
		setError(null);
		setNewImage(file);
	};

	const handleEditSubmit = async () => {
		// Every field is mandatory — same rules as the server, checked here first
		const check = inventoryItemSchema.safeParse(editedItem);
		if (!check.success) {
			setError(translateMessage(check.error.errors[0].message));
			return;
		}
		if (!item.imageUrl && !newImage) {
			setError(translateMessage(INVENTORY_ITEM_MESSAGES.photoRequired));
			return;
		}

		setIsLoading(true);
		setError(null);

		const formData = new FormData();
		formData.append("id", item.id);
		formData.append("itemName", editedItem.itemName);
		formData.append("itemCode", editedItem.itemCode);
		formData.append("category", editedItem.category);
		formData.append("description", editedItem.description);
		formData.append("quantity", editedItem.quantity);
		formData.append("originalQuantity", String(item.quantity));
		formData.append("unit", editedItem.unit);
		formData.append("unitPrice", editedItem.unitPrice ? String(editedItem.unitPrice) : "");
		formData.append("supplier", editedItem.supplier);
		formData.append("location", editedItem.location);
		formData.append("division", editedItem.division);
		if (newImage) formData.append("images", newImage);

		try {
			const result = await updateInventoryItem(formData);

			if (result.success) {
				setIsEditDialogOpen(false);
				setNewImage(null);
				router.refresh(); // Refresh the page to show updated data
			} else {
				setError(translateMessage(result.message));
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
					<Button variant='outline' onClick={() => router.push(`${inventoryBasePath(role)}/restock/${item.id}`)} className='flex items-center gap-2'>
						<Plus size={16} />
						Restock
					</Button>
					<Button onClick={openEditDialog} className='flex items-center gap-2'>
						<Pencil size={16} />
						Edit Item
					</Button>
					{role === "admin" && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant='destructive' className='flex items-center gap-2' disabled={isLoading}>
									<Trash2 size={16} />
									Delete
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete &quot;{item.itemName}&quot;?</AlertDialogTitle>
									<AlertDialogDescription>
										This permanently removes the item along with its transaction history, pending requests, employee stock records, and complaint usage logs. This cannot be undone.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction onClick={handleDelete} className='bg-red-600 hover:bg-red-700' disabled={isLoading}>
										{isLoading ? "Deleting..." : "Delete Item"}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
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
									<span className='text-2xl font-semibold'>{formatQty(item.quantity, item.unit)}</span>
								</div>
							</div>
							{item.unitPrice && (
								<div>
									<Label className='text-gray-500 text-xs'>Unit Price</Label>
									<div className='flex items-center gap-2 mt-1'>
										<Banknote size={18} className='text-green-600' />
										<span className='text-2xl font-semibold'>AED {item.unitPrice.toFixed(2)}</span>
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
							<div className='flex items-center gap-2'>
								<Globe size={16} className='text-gray-500' />
								<span className='text-sm'>
									<strong>Division:</strong> {item.division === "DUBAI" ? "Dubai" : item.division === "SHARJAH" ? "Sharjah" : item.division}
								</span>
							</div>
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
											{formatQty(txn.quantity, item.unit)}
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
							<Label htmlFor='itemCode'>
								Item Code <span className='text-red-500'>*</span>
							</Label>
							<Input id='itemCode' value={editedItem.itemCode} onChange={(e) => setEditedItem({ ...editedItem, itemCode: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='category'>
								Category <span className='text-red-500'>*</span>
							</Label>
							<Input id='category' value={editedItem.category} onChange={(e) => setEditedItem({ ...editedItem, category: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='description'>
								Description <span className='text-red-500'>*</span>
							</Label>
							<Textarea id='description' value={editedItem.description} onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='unit'>
								Unit <span className='text-red-500'>*</span>
							</Label>
							<Select value={editedItem.unit} onValueChange={(value) => setEditedItem({ ...editedItem, unit: value })} disabled={isLoading}>
								<SelectTrigger>
									<SelectValue placeholder='Select unit' />
								</SelectTrigger>
								<SelectContent>
									{UNIT_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor='quantity'>
								Quantity ({unitLabel(editedItem.unit)}) <span className='text-red-500'>*</span>
							</Label>
							<Input id='quantity' type='number' step={qtyStep(editedItem.unit)} value={editedItem.quantity} onChange={(e) => setEditedItem({ ...editedItem, quantity: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='unitPrice'>
								Unit Price (AED) <span className='text-red-500'>*</span>
							</Label>
							<Input id='unitPrice' type='number' step='0.01' value={editedItem.unitPrice} onChange={(e) => setEditedItem({ ...editedItem, unitPrice: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='supplier'>
								Supplier <span className='text-red-500'>*</span>
							</Label>
							<Input id='supplier' value={editedItem.supplier} onChange={(e) => setEditedItem({ ...editedItem, supplier: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='location'>
								Location <span className='text-red-500'>*</span>
							</Label>
							<Input id='location' value={editedItem.location} onChange={(e) => setEditedItem({ ...editedItem, location: e.target.value })} disabled={isLoading} />
						</div>

						<div>
							<Label htmlFor='division'>Division <span className='text-red-500'>*</span></Label>
							<Select value={editedItem.division} onValueChange={(value) => setEditedItem({ ...editedItem, division: value })} disabled={isLoading}>
								<SelectTrigger>
									<SelectValue placeholder='Select division' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='DUBAI'>Dubai</SelectItem>
									<SelectItem value='SHARJAH'>Sharjah</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor='itemImage'>
								Item Photo <span className='text-red-500'>*</span>
							</Label>
							<Input id='itemImage' type='file' accept='image/jpeg,image/png' onChange={handleImageChange} disabled={isLoading} />
							<p className='text-xs text-gray-500 mt-1'>
								{newImage ? `New photo: ${newImage.name}` : item.imageUrl ? "Leave empty to keep the current photo." : "This item has no photo yet — please add one."}
							</p>
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
