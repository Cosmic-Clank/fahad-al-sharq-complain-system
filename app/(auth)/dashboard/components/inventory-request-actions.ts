"use server";

import { z } from "zod";
import prismaClient from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isValidQtyForUnit, unitLabel } from "@/lib/inventory-units";
import { logActivity } from "@/lib/activity-log";

const createInventoryRequestSchema = z.object({
	inventoryId: z.string().min(1, "Please select an item"),
	quantity: z.coerce.number().positive("Quantity must be greater than 0"),
	reason: z.string().min(2, "Reason must be at least 2 characters").max(500),
	notes: z.string().optional().or(z.literal("")),
});

export async function createInventoryRequest(formData: FormData, employeeId: number) {
	try {
		const rawData = {
			inventoryId: formData.get("inventoryId"),
			quantity: formData.get("quantity"),
			reason: formData.get("reason"),
			notes: formData.get("notes"),
		};

		const validatedData = createInventoryRequestSchema.parse(rawData);
		const itemId = Number(validatedData.inventoryId);
		const empId = Number(employeeId); // Ensure employeeId is a number

		// Get the inventory item
		const item = await prismaClient.inventory.findUnique({
			where: { id: itemId },
		});

		if (!item) {
			return {
				success: false,
				message: "Item not found",
			};
		}

		if (!isValidQtyForUnit(validatedData.quantity, item.unit)) {
			return {
				success: false,
				message: "Quantity must be a whole number for items counted in pieces.",
			};
		}

		// Validate requested quantity
		if (validatedData.quantity > item.quantity) {
			return {
				success: false,
				message: `Insufficient inventory. Available: ${item.quantity} ${unitLabel(item.unit)}, Requested: ${validatedData.quantity} ${unitLabel(item.unit)}`,
			};
		}

		// Create the inventory request
		const request = await prismaClient.inventoryRequest.create({
			data: {
				inventoryId: itemId,
				employeeId: empId,
				quantity: validatedData.quantity,
				reason: validatedData.reason,
				notes: validatedData.notes || null,
			},
			include: {
				inventory: true,
				employee: true,
			},
		});

		await logActivity({
			actorId: empId,
			targetUserId: empId,
			action: "INVENTORY_REQUEST_CREATE",
			entityType: "InventoryRequest",
			entityId: request.id,
			details: `${request.employee.fullName} requested ${validatedData.quantity} ${unitLabel(item.unit)} of "${item.itemName}"`,
		});

		// Revalidate relevant paths
		revalidatePath("/dashboard/employee/inventory");
		revalidatePath(`/dashboard/inventory_manager/requests`);

		return {
			success: true,
			message: "Inventory request created successfully!",
			requestId: request.id,
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

		console.error("Error creating inventory request:", error);
		return {
			success: false,
			message: "Failed to create inventory request. Please try again.",
		};
	}
}

// Get all pending inventory requests for an employee
export async function getEmployeeInventoryRequests(employeeId: number) {
	try {
		const empId = Number(employeeId); // Ensure employeeId is a number
		const requests = await prismaClient.inventoryRequest.findMany({
			where: {
				employeeId: empId,
			},
			include: {
				inventory: true,
				approver: {
					select: {
						id: true,
						fullName: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return requests;
	} catch (error) {
		console.error("Error fetching employee inventory requests:", error);
		return [];
	}
}

// Get all inventory items for dropdown (only items with quantity > 0)
export async function getAvailableInventoryItems() {
	try {
		const items = await prismaClient.inventory.findMany({
			where: {
				quantity: {
					gt: 0, // Only items with quantity greater than 0
				},
			},
			select: {
				id: true,
				itemName: true,
				itemCode: true,
				quantity: true,
				unit: true,
				imageUrl: true,
				unitPrice: true,
			},
			orderBy: {
				itemName: "asc",
			},
		});

		return items;
	} catch (error) {
		console.error("Error fetching available inventory items:", error);
		return [];
	}
}
