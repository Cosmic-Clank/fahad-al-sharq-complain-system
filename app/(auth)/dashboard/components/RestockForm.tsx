"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { restockInventoryItem, getAllInventoryItems } from "./inventory-actions";
import { Loading } from "@/components/ui/loading";
import { ItemsCombobox } from "@/components/ItemsCombobox";
import { Package, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

const restockFormSchema = z.object({
	itemId: z.string().min(1, "Please select an item"),
	quantityToAdd: z.coerce.number().positive("Quantity must be greater than 0"),
	notes: z.string().optional(),
});

type RestockFormValues = z.infer<typeof restockFormSchema>;

interface InventoryItem {
	id: number;
	itemName: string;
	itemCode: string | null;
	quantity: number;
	imageUrl: string | null;
}

interface RestockFormProps {
	initialItemId?: string;
}

function RestockForm({ initialItemId }: RestockFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
	const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
	const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	const form = useForm<RestockFormValues>({
		resolver: zodResolver(restockFormSchema),
		defaultValues: {
			itemId: initialItemId || "",
			quantityToAdd: 1,
			notes: "",
		},
	});

	// Fetch inventory items on mount
	useEffect(() => {
		const fetchItems = async () => {
			setIsLoading(true);
			const items = await getAllInventoryItems();
			setInventoryItems(items);
			setIsLoading(false);

			// If initialItemId is provided, find and set the selected item
			if (initialItemId) {
				const item = items.find((i) => i.id === Number(initialItemId));
				if (item) {
					setSelectedItem(item);
					form.setValue("itemId", initialItemId);
				}
			}
		};

		fetchItems();
	}, [initialItemId, form]);

	// Update URL when item selection changes
	const handleItemChange = (itemId: string) => {
		form.setValue("itemId", itemId);
		const item = inventoryItems.find((i) => i.id === Number(itemId));
		setSelectedItem(item || null);

		// Update URL to reflect selected item
		if (itemId) {
			router.push(`/dashboard/inventory_manager/restock/${itemId}`);
		}
	};

	const onSubmit = async (values: RestockFormValues) => {
		setIsSubmitting(true);
		setSubmitError(null);
		setSubmitSuccess(null);

		const formData = new FormData();
		formData.append("itemId", values.itemId);
		formData.append("quantityToAdd", String(values.quantityToAdd));
		formData.append("notes", values.notes || "");

		try {
			const res = await restockInventoryItem(formData);

			if (res.success) {
				setSubmitSuccess(res.message);
				// Reset quantity field but keep item selected
				form.setValue("quantityToAdd", 1);
				form.setValue("notes", "");

				// Update the selected item's quantity locally
				if (selectedItem) {
					const updatedItems = inventoryItems.map((item) =>
						item.id === selectedItem.id
							? { ...item, quantity: item.quantity + values.quantityToAdd }
							: item
					);
					setInventoryItems(updatedItems);
					setSelectedItem({
						...selectedItem,
						quantity: selectedItem.quantity + values.quantityToAdd,
					});
				}
			} else {
				setSubmitError(res.message || "Failed to restock item");
			}
		} catch (err) {
			console.error("Error submitting form:", err);
			setSubmitError("An unexpected error occurred. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loading />
			</div>
		);
	}

	const itemOptions = inventoryItems.map((item) => ({
		value: String(item.id),
		label: `${item.itemName}${item.itemCode ? ` (${item.itemCode})` : ""}`,
	}));

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='max-w-2xl mx-auto space-y-3 p-4'>
				<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
					<div className="flex items-center gap-2 mb-4">
						<Plus className="h-6 w-6 text-primary" />
						<h2 className='text-2xl font-bold'>Restock Inventory</h2>
					</div>
					<p className='text-gray-600'>Add quantity to an existing inventory item.</p>
				</div>

				{/* Item Selection */}
				<FormField
					control={form.control}
					name='itemId'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Select Item <span className='text-red-500'>*</span></FormLabel>
							<FormControl>
								<ItemsCombobox
									options={itemOptions}
									value={field.value}
									onChange={handleItemChange}
									placeholder="Search and select an item..."
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Current Item Info */}
				{selectedItem && (
					<div className='p-6 bg-blue-50 rounded-sm border-l-4 border-blue-500'>
						<div className="flex items-center gap-2 mb-2">
							<Package className="h-5 w-5 text-blue-600" />
							<h3 className='font-semibold text-blue-900'>Current Item Details</h3>
						</div>
						<div className="flex gap-4">
							{/* Image */}
							{selectedItem.imageUrl ? (
								<div className="flex-shrink-0 w-24 h-24 relative rounded-lg overflow-hidden border-2 border-blue-200">
									<Image
										src={selectedItem.imageUrl}
										alt={selectedItem.itemName}
										fill
										className="object-cover"
									/>
								</div>
							) : (
								<div className="flex-shrink-0 w-24 h-24 bg-blue-100 rounded-lg flex items-center justify-center border-2 border-blue-200">
									<Package className="h-10 w-10 text-blue-300" />
								</div>
							)}
							{/* Item Details */}
							<div className="space-y-1 text-sm flex-1">
								<p><span className="font-medium">Item Name:</span> {selectedItem.itemName}</p>
								{selectedItem.itemCode && (
									<p><span className="font-medium">Item Code:</span> {selectedItem.itemCode}</p>
								)}
								<p className="flex items-center gap-2">
									<span className="font-medium">Current Quantity:</span>
									<Badge variant="secondary">{selectedItem.quantity} units</Badge>
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Quantity to Add */}
				<FormField
					control={form.control}
					name='quantityToAdd'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Quantity to Add <span className='text-red-500'>*</span></FormLabel>
							<FormControl>
								<Input
									type='number'
									min="1"
									placeholder='Enter quantity to add'
									{...field}
									disabled={isSubmitting || !selectedItem}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Notes */}
				<FormField
					control={form.control}
					name='notes'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Notes (Optional)</FormLabel>
							<FormControl>
								<Textarea
									placeholder='Add any notes about this restock...'
									{...field}
									disabled={isSubmitting || !selectedItem}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{submitError && <p className='text-red-500 text-sm bg-red-50 border border-red-200 rounded p-3'>{submitError}</p>}
				{submitSuccess && <p className='text-green-600 text-sm bg-green-50 border border-green-200 rounded p-3'>{submitSuccess}</p>}

				<Button type='submit' className='w-full hover:cursor-pointer' disabled={isSubmitting || !selectedItem}>
					{isSubmitting ? (
						<>
							<Loading />
							Adding Stock...
						</>
					) : (
						<>
							<Plus className="h-4 w-4 mr-2" />
							Add to Stock
						</>
					)}
				</Button>
			</form>
		</Form>
	);
}

export default RestockForm;
