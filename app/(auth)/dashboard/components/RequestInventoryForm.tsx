"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { createInventoryRequest, getAvailableInventoryItems } from "./inventory-request-actions";
import { Loading } from "@/components/ui/loading";
import { ItemsCombobox } from "@/components/ItemsCombobox";
import { Package, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

const requestFormSchema = z.object({
	inventoryId: z.string().min(1, "Please select an item"),
	quantity: z.coerce.number().positive("Quantity must be greater than 0"),
	reason: z.string().min(2, "Reason must be at least 2 characters").max(500),
	notes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

interface InventoryItem {
	id: number;
	itemName: string;
	itemCode: string | null;
	quantity: number;
	imageUrl: string | null;
	unitPrice: number | null;
}

interface RequestInventoryFormProps {
	employeeId: number;
}

function RequestInventoryForm({ employeeId }: RequestInventoryFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
	const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
	const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	const form = useForm<RequestFormValues>({
		resolver: zodResolver(requestFormSchema),
		defaultValues: {
			inventoryId: "",
			quantity: 1,
			reason: "",
			notes: "",
		},
	});

	// Fetch available inventory items on mount
	useEffect(() => {
		const fetchItems = async () => {
			setIsLoading(true);
			const items = await getAvailableInventoryItems();
			setInventoryItems(items);
			setIsLoading(false);
		};

		fetchItems();
	}, []);

	// Handle item selection
	const handleItemChange = (itemId: string) => {
		form.setValue("inventoryId", itemId);
		form.setValue("quantity", 1); // Reset quantity when item changes
		const item = inventoryItems.find((i) => i.id === Number(itemId));
		setSelectedItem(item || null);
		setSubmitError(null); // Clear error when item changes
	};

	// Validate quantity on change
	const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = Number(e.target.value);
		form.setValue("quantity", value);

		if (selectedItem && value > selectedItem.quantity) {
			setSubmitError(`Cannot request more than ${selectedItem.quantity} units available`);
		} else {
			setSubmitError(null);
		}
	};

	const onSubmit = async (values: RequestFormValues) => {
		// Final validation
		if (selectedItem && values.quantity > selectedItem.quantity) {
			setSubmitError(`Cannot request more than ${selectedItem.quantity} units available`);
			return;
		}

		setIsSubmitting(true);
		setSubmitError(null);
		setSubmitSuccess(null);

		const formData = new FormData();
		formData.append("inventoryId", values.inventoryId);
		formData.append("quantity", String(values.quantity));
		formData.append("reason", values.reason);
		formData.append("notes", values.notes || "");

		try {
			const res = await createInventoryRequest(formData, employeeId);

			if (res.success) {
				setSubmitSuccess(res.message);
				// Reset form
				form.reset();
				setSelectedItem(null);
				// Redirect after 2 seconds
				setTimeout(() => {
					router.push("/dashboard/employee/inventory");
				}, 2000);
			} else {
				setSubmitError(res.message || "Failed to create inventory request");
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
		label: `${item.itemName}${item.itemCode ? ` (${item.itemCode})` : ""} - ${item.quantity} available`,
	}));

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='max-w-2xl mx-auto space-y-3 p-4'>
				<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
					<div className="flex items-center gap-2 mb-4">
						<Plus className="h-6 w-6 text-primary" />
						<h2 className='text-2xl font-bold'>Request Inventory Item</h2>
					</div>
					<p className='text-gray-600'>Submit a request to get inventory items from the stock. An inventory manager will review and approve your request.</p>
				</div>

				{/* Item Selection */}
				<FormField
					control={form.control}
					name='inventoryId'
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

				{/* Selected Item Info */}
				{selectedItem && (
					<div className='p-6 bg-blue-50 rounded-sm border-l-4 border-blue-500'>
						<div className="flex items-center gap-2 mb-2">
							<Package className="h-5 w-5 text-blue-600" />
							<h3 className='font-semibold text-blue-900'>Item Details</h3>
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
									<span className="font-medium">Available Quantity:</span>
									<Badge variant="secondary">{selectedItem.quantity} units</Badge>
								</p>
								{selectedItem.unitPrice && (
									<p><span className="font-medium">Unit Price:</span> ${selectedItem.unitPrice.toFixed(2)}</p>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Quantity */}
				<FormField
					control={form.control}
					name='quantity'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Quantity to Request <span className='text-red-500'>*</span></FormLabel>
							<FormControl>
								<Input
									type='number'
									min="1"
									max={selectedItem?.quantity}
									placeholder='Enter quantity'
									{...field}
									onChange={handleQuantityChange}
									disabled={isSubmitting || !selectedItem}
								/>
							</FormControl>
							{selectedItem && (
								<p className='text-xs text-gray-500 mt-1'>
									Max available: {selectedItem.quantity} units
								</p>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Reason */}
				<FormField
					control={form.control}
					name='reason'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Reason for Request <span className='text-red-500'>*</span></FormLabel>
							<FormControl>
								<Textarea
									placeholder='Explain why you need this item...'
									{...field}
									disabled={isSubmitting || !selectedItem}
									rows={3}
								/>
							</FormControl>
							<p className='text-xs text-gray-500 mt-1'>
								{field.value.length}/500 characters
							</p>
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
							<FormLabel>Additional Notes (Optional)</FormLabel>
							<FormControl>
								<Textarea
									placeholder='Add any additional information...'
									{...field}
									disabled={isSubmitting || !selectedItem}
									rows={2}
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
							Submitting Request...
						</>
					) : (
						<>
							<Plus className="h-4 w-4 mr-2" />
							Submit Request
						</>
					)}
				</Button>
			</form>
		</Form>
	);
}

export default RequestInventoryForm;
