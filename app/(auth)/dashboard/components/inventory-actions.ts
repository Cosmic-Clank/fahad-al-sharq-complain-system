"use server";

import { z } from "zod";
import prismaClient from "@/lib/prisma";
import supabaseAdminClient from "@/lib/supabaseAdmin";
import { nanoid } from "nanoid";
import path from "path";
import { revalidatePath } from "next/cache";

const serverInventoryFormSchema = z.object({
	itemName: z.string({ required_error: "Item name is required" }).min(2, { message: "Item name must be at least 2 characters long" }).max(100, { message: "Item name must be at most 100 characters long" }),
	itemCode: z.string().optional().or(z.literal("")),
	category: z.string().optional().or(z.literal("")),
	description: z.string().optional().or(z.literal("")),
	quantity: z.coerce.number({ required_error: "Quantity is required" }).min(0, { message: "Quantity must be at least 0" }),
	unitPrice: z.coerce.number().positive().optional().or(z.literal("")),
	supplier: z.string().optional().or(z.literal("")),
	location: z.string().optional().or(z.literal("")),
});

export async function createInventoryItem(formData: FormData) {
	try {
		// Extract form data
		const rawData = {
			itemName: formData.get("itemName"),
			itemCode: formData.get("itemCode"),
			category: formData.get("category"),
			description: formData.get("description"),
			quantity: formData.get("quantity"),
			unitPrice: formData.get("unitPrice"),
			supplier: formData.get("supplier"),
			location: formData.get("location"),
		};

		// Validate data
		const validatedData = serverInventoryFormSchema.parse(rawData);

		// Handle image upload to Supabase
		let imageUrl: string | null = null;
		const files = formData.getAll("images") as File[];

		if (files.length > 0) {
			const file = files[0]; // Take only the first image

			// Validate file
			const maxSize = 5 * 1024 * 1024; // 5MB
			const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

			if (!allowedTypes.includes(file.type) || file.size > maxSize) {
				return {
					success: false,
					message: `Invalid file. Max size is 5MB, supported types are JPEG, PNG.`,
				};
			}

			// Upload to Supabase
			try {
				const directoryName = `inventory-items`;
				const extension = path.extname(file.name) || ".jpg";
				const uniqueFileName = `${nanoid()}${extension}`;
				const uploadPath = path.posix.join(directoryName, uniqueFileName);

				// Check if bucket exists, if not the upload will fail but we handle it
				const { data, error } = await supabaseAdminClient.storage.from("inventory-images").upload(uploadPath, file, { upsert: false });

				if (error) {
					console.error("Supabase upload error:", error);
					return {
						success: false,
						message: `Failed to upload image. Please try again.`,
					};
				}

				// Construct public URL for the uploaded image
				const BASE_URL = "https://koxptzqfmeasndsaecyo.supabase.co";
				imageUrl = `${BASE_URL}/storage/v1/object/public/inventory-images/${data.path}`;
			} catch (error) {
				console.error("Error during image upload:", error);
				return {
					success: false,
					message: `Failed to upload image. Please try again.`,
				};
			}
		}

		// Create inventory item in database
		const inventoryItem = await prismaClient.inventory.create({
			data: {
				itemName: validatedData.itemName,
				itemCode: validatedData.itemCode || null,
				category: validatedData.category || null,
				description: validatedData.description || null,
				quantity: validatedData.quantity,
				unitPrice: validatedData.unitPrice ? Number(validatedData.unitPrice) : null,
				supplier: validatedData.supplier || null,
				location: validatedData.location || null,
				imageUrl: imageUrl,
			},
		});

		// Create an ADD transaction record
		await prismaClient.inventoryTransaction.create({
			data: {
				inventoryId: inventoryItem.id,
				quantity: validatedData.quantity,
				transactionType: "ADD",
				notes: "Initial inventory addition",
			},
		});

		// Revalidate relevant paths
		revalidatePath("/dashboard/inventory_manager");
		revalidatePath("/dashboard/admin");

		return {
			success: true,
			message: "Inventory item created successfully!",
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			const fieldErrors = error.flatten().fieldErrors;
			const errorMessages = Object.entries(fieldErrors)
				.map(([field, messages]) => `${field}: ${messages?.join(", ")}`)
				.join("; ");
			return {
				success: false,
				message: `Validation error: ${errorMessages}`,
			};
		}

		console.error("Error creating inventory item:", error);
		return {
			success: false,
			message: "Failed to create inventory item. Please try again.",
		};
	}
}

const serverInventoryUpdateSchema = z.object({
	id: z.string({ required_error: "Item ID is required" }),
	itemName: z.string({ required_error: "Item name is required" }).min(2, { message: "Item name must be at least 2 characters long" }).max(100, { message: "Item name must be at most 100 characters long" }),
	itemCode: z.string().optional().or(z.literal("")),
	category: z.string().optional().or(z.literal("")),
	description: z.string().optional().or(z.literal("")),
	quantity: z.coerce.number({ required_error: "Quantity is required" }).min(0, { message: "Quantity must be at least 0" }),
	unitPrice: z.coerce.number().positive().optional().or(z.literal("")),
	supplier: z.string().optional().or(z.literal("")),
	location: z.string().optional().or(z.literal("")),
});

export async function updateInventoryItem(formData: FormData) {
	try {
		// Extract form data
		const rawData = {
			id: formData.get("id"),
			itemName: formData.get("itemName"),
			itemCode: formData.get("itemCode"),
			category: formData.get("category"),
			description: formData.get("description"),
			quantity: formData.get("quantity"),
			unitPrice: formData.get("unitPrice"),
			supplier: formData.get("supplier"),
			location: formData.get("location"),
		};

		// Validate data
		const validatedData = serverInventoryUpdateSchema.parse(rawData);
		const itemId = Number(validatedData.id);

		// Get the current inventory item to check quantity change
		const currentItem = await prismaClient.inventory.findUnique({
			where: { id: itemId },
		});

		if (!currentItem) {
			return {
				success: false,
				message: "Inventory item not found.",
			};
		}

		// Calculate quantity difference
		const quantityDiff = validatedData.quantity - currentItem.quantity;

		// Update inventory item in database
		await prismaClient.inventory.update({
			where: { id: itemId },
			data: {
				itemName: validatedData.itemName,
				itemCode: validatedData.itemCode || null,
				category: validatedData.category || null,
				description: validatedData.description || null,
				quantity: validatedData.quantity,
				unitPrice: validatedData.unitPrice ? Number(validatedData.unitPrice) : null,
				supplier: validatedData.supplier || null,
				location: validatedData.location || null,
			},
		});

		// Create transaction record if quantity changed
		if (quantityDiff !== 0) {
			await prismaClient.inventoryTransaction.create({
				data: {
					inventoryId: itemId,
					quantity: Math.abs(quantityDiff),
					transactionType: quantityDiff > 0 ? "ADD" : "REMOVE",
					notes: "Manual adjustment via edit",
				},
			});
		}

		// Revalidate relevant paths
		revalidatePath("/dashboard/inventory_manager");
		revalidatePath("/dashboard/admin");

		return {
			success: true,
			message: "Inventory item updated successfully!",
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			const fieldErrors = error.flatten().fieldErrors;
			const errorMessages = Object.entries(fieldErrors)
				.map(([field, messages]) => `${field}: ${messages?.join(", ")}`)
				.join("; ");
			return {
				success: false,
				message: `Validation error: ${errorMessages}`,
			};
		}

		console.error("Error updating inventory item:", error);
		return {
			success: false,
			message: "Failed to update inventory item. Please try again.",
		};
	}
}

// Restock server action
const restockSchema = z.object({
	itemId: z.string().min(1, "Item selection is required"),
	quantityToAdd: z.coerce.number().positive("Quantity must be greater than 0"),
	notes: z.string().optional().or(z.literal("")),
});

export async function restockInventoryItem(formData: FormData) {
	try {
		const rawData = {
			itemId: formData.get("itemId"),
			quantityToAdd: formData.get("quantityToAdd"),
			notes: formData.get("notes"),
		};

		const validatedData = restockSchema.parse(rawData);
		const itemId = Number(validatedData.itemId);

		// Get current item
		const item = await prismaClient.inventory.findUnique({
			where: { id: itemId },
		});

		if (!item) {
			return {
				success: false,
				message: "Item not found",
			};
		}

		// Update quantity
		const newQuantity = item.quantity + validatedData.quantityToAdd;

		await prismaClient.inventory.update({
			where: { id: itemId },
			data: { quantity: newQuantity },
		});

		// Create ADD transaction
		await prismaClient.inventoryTransaction.create({
			data: {
				inventoryId: itemId,
				quantity: validatedData.quantityToAdd,
				transactionType: "ADD",
				notes: validatedData.notes || "Restocked via restock form",
			},
		});

		// Revalidate paths
		revalidatePath("/dashboard/inventory_manager");
		revalidatePath("/dashboard/admin");

		return {
			success: true,
			message: `Successfully added ${validatedData.quantityToAdd} units. New quantity: ${newQuantity}`,
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			const fieldErrors = error.flatten().fieldErrors;
			const errorMessages = Object.entries(fieldErrors)
				.map(([field, messages]) => `${field}: ${messages?.join(", ")}`)
				.join("; ");
			return {
				success: false,
				message: `Validation error: ${errorMessages}`,
			};
		}

		console.error("Error restocking inventory item:", error);
		return {
			success: false,
			message: "Failed to restock item. Please try again.",
		};
	}
}

// Get all inventory items for dropdown
export async function getAllInventoryItems() {
	try {
		const items = await prismaClient.inventory.findMany({
			select: {
				id: true,
				itemName: true,
				itemCode: true,
				quantity: true,
				imageUrl: true,
			},
			orderBy: {
				itemName: "asc",
			},
		});

		return items;
	} catch (error) {
		console.error("Error fetching inventory items:", error);
		return [];
	}
}
