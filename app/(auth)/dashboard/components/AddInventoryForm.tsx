"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createInventoryItem } from "./inventory-actions";
import { Loading } from "@/components/ui/loading";

const inventoryFormSchema = z.object({
	itemName: z.string({ required_error: "Item name is required" }).min(2, { message: "Item name must be at least 2 characters long" }).max(100, { message: "Item name must be at most 100 characters long" }),
	itemCode: z.string().optional(),
	category: z.string().optional(),
	description: z.string().optional(),
	quantity: z.coerce.number({ required_error: "Quantity is required" }).min(0, { message: "Quantity must be at least 0" }),
	unitPrice: z.coerce.number().positive().optional().or(z.literal("")),
	supplier: z.string().optional(),
	location: z.string().optional(),
});

type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

function AddInventoryForm() {
	const [images, setImages] = React.useState<File[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const router = useRouter();

	const form = useForm<InventoryFormValues>({
		resolver: zodResolver(inventoryFormSchema),
		defaultValues: {
			itemName: "",
			itemCode: "",
			category: "",
			description: "",
			quantity: 0,
			unitPrice: undefined,
			supplier: "",
			location: "",
		},
	});

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const selectedFiles = Array.from(e.target.files);
			const maxImages = 1;
			const maxSize = 5 * 1024 * 1024;
			const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

			if (selectedFiles.length > maxImages) {
				setSubmitError(`You can upload a maximum of ${maxImages} image.`);
				e.target.value = "";
				return;
			}

			const invalidFiles = selectedFiles.filter((file) => file.size > maxSize || !allowedTypes.includes(file.type));
			if (invalidFiles.length > 0) {
				setSubmitError(`Some files are invalid: Max size is 5MB, supported types are ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}.`);
				e.target.value = "";
				return;
			}
			setImages(selectedFiles);
			setSubmitError(null);
		}
	};

	const onSubmit = async (values: InventoryFormValues) => {
		setIsSubmitting(true);
		setSubmitError(null);

		const formData = new FormData();
		formData.append("itemName", values.itemName);
		formData.append("itemCode", values.itemCode || "");
		formData.append("category", values.category || "");
		formData.append("description", values.description || "");
		formData.append("quantity", String(values.quantity));
		formData.append("unitPrice", values.unitPrice ? String(values.unitPrice) : "");
		formData.append("supplier", values.supplier || "");
		formData.append("location", values.location || "");

		images.forEach((file) => {
			formData.append("images", file);
		});

		try {
			const res = await createInventoryItem(formData);

			if (res.success) {
				router.push("/dashboard/inventory_manager");
			} else {
				setSubmitError(res.message || "Failed to create inventory item");
			}
		} catch (err) {
			console.error("Error submitting form:", err);
			setSubmitError("An unexpected error occurred. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='max-w-2xl mx-auto space-y-3 p-4'>
				<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
					<h2 className='text-2xl font-bold mb-4'>New Inventory Item</h2>
					<p className='text-gray-600 mb-4'>Fill out the form below to create a new item.</p>
				</div>

				{/* Item Name */}
				<FormField
					control={form.control}
					name='itemName'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Item Name <span className='text-red-500'>*</span></FormLabel>
							<FormControl>
								<Input placeholder='Enter item name' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Item Code */}
				<FormField
					control={form.control}
					name='itemCode'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Item Code (Optional)</FormLabel>
							<FormControl>
								<Input placeholder='e.g., SKU-001' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Category */}
				<FormField
					control={form.control}
					name='category'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Category (Optional)</FormLabel>
							<FormControl>
								<Input placeholder='e.g., Tools, Materials, Parts' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Description */}
				<FormField
					control={form.control}
					name='description'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Description (Optional)</FormLabel>
							<FormControl>
								<Textarea placeholder='Enter item description' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Quantity */}
				<FormField
					control={form.control}
					name='quantity'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Quantity <span className='text-red-500'>*</span></FormLabel>
							<FormControl>
								<Input type='number' placeholder='Enter quantity' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Unit Price */}
				<FormField
					control={form.control}
					name='unitPrice'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Unit Price (Optional)</FormLabel>
							<FormControl>
								<Input type='number' placeholder='Enter unit price' step='0.01' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Supplier */}
				<FormField
					control={form.control}
					name='supplier'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Supplier (Optional)</FormLabel>
							<FormControl>
								<Input placeholder='Enter supplier name' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Location */}
				<FormField
					control={form.control}
					name='location'
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Location (Optional)</FormLabel>
							<FormControl>
								<Input placeholder='e.g., Warehouse A, Shelf 3' {...field} disabled={isSubmitting} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Image Upload */}
				<div className='p-6 bg-white rounded-sm border-l-4 border-gray-300'>
					<Label className='block text-sm font-medium text-gray-700 mb-2'>Upload Image (Optional)</Label>
					<Input
						accept='image/*'
						type='file'
						name='images'
						onChange={(e) => {
							if (e.target.files && e.target.files.length > 1) {
								setSubmitError("You can upload a maximum of 1 image.");
								e.target.value = "";
								return;
							}
							handleFileChange(e);
						}}
						className='w-full'
						disabled={isSubmitting}
					/>
					{images.length > 0 && (
						<div className='mt-4'>
							<p className='text-sm text-gray-500 mb-2'>Selected: {images[0].name}</p>
							<div className='w-32 h-32 border rounded overflow-hidden flex items-center justify-center bg-gray-100'>
								<Image width={150} height={150} src={URL.createObjectURL(images[0])} alt={images[0].name} className='object-cover w-full h-full' onLoad={(e) => URL.revokeObjectURL((e.currentTarget as HTMLImageElement).src)} />
							</div>
						</div>
					)}
					{images.length === 0 && <p className='text-sm text-gray-500 mt-2'>No file selected</p>}
				</div>

				{submitError && <p className='text-red-500 text-sm bg-red-50 border border-red-200 rounded p-3'>{submitError}</p>}

				<Button type='submit' className='w-full hover:cursor-pointer' disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<Loading />
							Creating...
						</>
					) : (
						"Create New Item"
					)}
				</Button>
			</form>
		</Form>
	);
}

export default AddInventoryForm;
