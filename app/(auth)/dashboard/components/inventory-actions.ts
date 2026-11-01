"use server";

import { z } from "zod";
import prismaClient from "@/lib/prisma";
import supabaseAdminClient from "@/lib/supabaseAdmin";
import { nanoid } from "nanoid";
import path from "path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isValidQtyForUnit, unitLabel } from "@/lib/inventory-units";
import { inventoryItemFields, inventoryItemSchema, pieceQuantityCheck, INVENTORY_IMAGE_TYPES, INVENTORY_ITEM_MESSAGES, MAX_INVENTORY_IMAGE_BYTES } from "@/lib/inventory-item-schema";
import { logActivity } from "@/lib/activity-log";
import { getActor, requireRole } from "@/lib/authz";

async function currentActor() {
	const session = await auth();
	const id = Number(session?.user?.id);
	return Number.isFinite(id) ? { id, name: session?.user?.name ?? "Unknown" } : null;
}

/** Uploads the item photo to the inventory-images bucket and returns its public URL. */
async function uploadInventoryImage(file: File): Promise<{ url: string } | { error: string }> {
	if (!INVENTORY_IMAGE_TYPES.includes(file.type) || file.size > MAX_INVENTORY_IMAGE_BYTES) {
		return { error: `Invalid file. Max size is 5MB, supported types are JPEG, PNG.` };
	}
	try {
		const extension = path.extname(file.name) || ".jpg";
		const uploadPath = path.posix.join("inventory-items", `${nanoid()}${extension}`);
		const { data, error } = await supabaseAdminClient.storage.from("inventory-images").upload(uploadPath, file, { upsert: false });
		if (error) {
			console.error("Supabase upload error:", error);
			return { error: `Failed to upload image. Please try again.` };
		}
		const BASE_URL = "https://koxptzqfmeasndsaecyo.supabase.co";
		return { url: `${BASE_URL}/storage/v1/object/public/inventory-images/${data.path}` };
	} catch (error) {
		console.error("Error during image upload:", error);
		return { error: `Failed to upload image. Please try again.` };
	}
}

/** The first non-empty file in the "images" field, if any. */
function uploadedImage(formData: FormData): File | null {
	const file = (formData.getAll("images") as File[]).find((f) => f && f.size > 0);
	return file ?? null;
}

export async function createInventoryItem(formData: FormData) {
	if (!(await requireRole(["ADMIN", "INVENTORY_MANAGER"]))) {
		return { success: false, message: "Unauthorized. Please log in." };
	}
	try {
		// Extract form data
		const rawData = {
			itemName: formData.get("itemName"),
			itemCode: formData.get("itemCode"),
			category: formData.get("category"),
			description: formData.get("description"),
			quantity: formData.get("quantity"),
			unit: formData.get("unit") ?? "PIECES",
			unitPrice: formData.get("unitPrice"),
			supplier: formData.get("supplier"),
			location: formData.get("location"),
			division: formData.get("division"),
		};

		// Validate data
		const validatedData = inventoryItemSchema.parse(rawData);

		// Photo is mandatory
		const file = uploadedImage(formData);
		if (!file) {
			return { success: false, message: INVENTORY_ITEM_MESSAGES.photoRequired };
		}
		const upload = await uploadInventoryImage(file);
		if ("error" in upload) {
			return { success: false, message: upload.error };
		}
		const imageUrl = upload.url;

		// Create inventory item in database
		const inventoryItem = await prismaClient.inventory.create({
			data: {
				itemName: validatedData.itemName,
				itemCode: validatedData.itemCode,
				category: validatedData.category,
				description: validatedData.description,
				quantity: validatedData.quantity,
				unit: validatedData.unit,
				unitPrice: validatedData.unitPrice,
				supplier: validatedData.supplier,
				location: validatedData.location,
				imageUrl: imageUrl,
				division: validatedData.division,
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

		const actor = await currentActor();
		await logActivity({
			actorId: actor?.id,
			action: "INVENTORY_CREATE",
			entityType: "Inventory",
			entityId: inventoryItem.id,
			details: `${actor?.name ?? "Someone"} created inventory item "${validatedData.itemName}" (${validatedData.quantity} ${unitLabel(validatedData.unit)})`,
		});

		// Revalidate relevant paths
		revalidatePath("/dashboard/inventory_manager");
		revalidatePath("/dashboard/admin/inventory");

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

const serverInventoryUpdateSchema = z
	.object({ id: z.string({ required_error: "Item ID is required" }), ...inventoryItemFields })
	.superRefine(pieceQuantityCheck);

export async function updateInventoryItem(formData: FormData) {
	if (!(await requireRole(["ADMIN", "INVENTORY_MANAGER"]))) {
		return { success: false, message: "Unauthorized. Please log in." };
	}
	try {
		// Extract form data
		const rawData = {
			id: formData.get("id"),
			itemName: formData.get("itemName"),
			itemCode: formData.get("itemCode"),
			category: formData.get("category"),
			description: formData.get("description"),
			quantity: formData.get("quantity"),
			unit: formData.get("unit") ?? "PIECES",
			unitPrice: formData.get("unitPrice"),
			supplier: formData.get("supplier"),
			location: formData.get("location"),
			division: formData.get("division"),
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

		// Photo is mandatory: keep the existing one, or a new one must be uploaded
		let imageUrl = currentItem.imageUrl;
		const newImage = uploadedImage(formData);
		if (newImage) {
			const upload = await uploadInventoryImage(newImage);
			if ("error" in upload) {
				return { success: false, message: upload.error };
			}
			imageUrl = upload.url;
		}
		if (!imageUrl) {
			return { success: false, message: INVENTORY_ITEM_MESSAGES.photoRequired };
		}

		// Calculate quantity difference
		const quantityDiff = validatedData.quantity - currentItem.quantity;

		// Update inventory item in database
		await prismaClient.inventory.update({
			where: { id: itemId },
			data: {
				itemName: validatedData.itemName,
				itemCode: validatedData.itemCode,
				category: validatedData.category,
				description: validatedData.description,
				quantity: validatedData.quantity,
				unit: validatedData.unit,
				unitPrice: validatedData.unitPrice,
				supplier: validatedData.supplier,
				location: validatedData.location,
				imageUrl,
				division: validatedData.division,
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

		const actor = await currentActor();
		await logActivity({
			actorId: actor?.id,
			action: "INVENTORY_UPDATE",
			entityType: "Inventory",
			entityId: itemId,
			details: `${actor?.name ?? "Someone"} updated inventory item "${validatedData.itemName}"${quantityDiff !== 0 ? ` (quantity ${quantityDiff > 0 ? "+" : ""}${quantityDiff})` : ""}`,
		});

		// Revalidate relevant paths
		revalidatePath("/dashboard/inventory_manager");
		revalidatePath("/dashboard/admin/inventory");

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
	if (!(await requireRole(["ADMIN", "INVENTORY_MANAGER"]))) {
		return { success: false, message: "Unauthorized. Please log in." };
	}
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

		if (!isValidQtyForUnit(validatedData.quantityToAdd, item.unit)) {
			return {
				success: false,
				message: "Quantity must be a whole number for items counted in pieces.",
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

		const actor = await currentActor();
		await logActivity({
			actorId: actor?.id,
			action: "INVENTORY_RESTOCK",
			entityType: "Inventory",
			entityId: itemId,
			details: `${actor?.name ?? "Someone"} restocked "${item.itemName}" by ${validatedData.quantityToAdd} ${unitLabel(item.unit)} (new total ${newQuantity})`,
		});

		// Revalidate paths
		revalidatePath("/dashboard/inventory_manager");
		revalidatePath("/dashboard/admin/inventory");

		return {
			success: true,
			message: `Successfully added ${validatedData.quantityToAdd} ${unitLabel(item.unit)}. New quantity: ${newQuantity} ${unitLabel(item.unit)}`,
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

// Delete an inventory item (admin only). Related transactions, requests,
// employee stock and complaint usages are removed by DB cascade.
export async function deleteInventoryItem(itemId: number) {
	const session = await auth();
	if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
		return { success: false, message: "Only admins can delete inventory items." };
	}

	try {
		const item = await prismaClient.inventory.findUnique({ where: { id: itemId } });
		if (!item) {
			return { success: false, message: "Item not found." };
		}

		await prismaClient.inventory.delete({ where: { id: itemId } });

		await logActivity({
			actorId: Number(session.user.id),
			action: "INVENTORY_DELETE",
			entityType: "Inventory",
			entityId: itemId,
			details: `${session.user.name ?? "Admin"} deleted inventory item "${item.itemName}" (had ${item.quantity} ${unitLabel(item.unit)})`,
		});

		revalidatePath("/dashboard/inventory_manager");
		revalidatePath("/dashboard/admin/inventory");

		return { success: true, message: `"${item.itemName}" deleted.` };
	} catch (error) {
		console.error("Error deleting inventory item:", error);
		return { success: false, message: "Failed to delete item. Please try again." };
	}
}

// Get all inventory items for dropdown
export async function getAllInventoryItems() {
	if (!(await getActor())) return [];
	try {
		const items = await prismaClient.inventory.findMany({
			select: {
				id: true,
				itemName: true,
				itemCode: true,
				quantity: true,
				unit: true,
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
