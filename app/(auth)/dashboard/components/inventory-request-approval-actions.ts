"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAllInventoryRequests(status?: string) {
	try {
		const where: any = status ? { status: status as any } : {};
		const requests = await prisma.inventoryRequest.findMany({
			where,
			include: {
				inventory: true,
				employee: {
					select: {
						id: true,
						fullName: true,
						username: true,
					},
				},
				approver: {
					select: {
						id: true,
						fullName: true,
						username: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return requests;
	} catch (error) {
		console.error("Error fetching inventory requests:", error);
		throw new Error("Failed to fetch inventory requests");
	}
}

export async function approveInventoryRequest(requestId: number, approverId: number) {
	try {
		// Get the request
		const request = await prisma.inventoryRequest.findUnique({
			where: { id: requestId },
			include: { inventory: true, employee: true },
		});

		const approver = await prisma.user.findUnique({
			where: { id: Number(approverId) },
			select: { fullName: true, username: true },
		});

		if (!request) {
			throw new Error("Request not found");
		}

		if (request.status !== "PENDING") {
			throw new Error("Only pending requests can be approved");
		}

		// Check if there's enough quantity available
		if (request.inventory.quantity < request.quantity) {
			throw new Error("Insufficient inventory quantity available");
		}

		// Reduce inventory quantity immediately on approval
		await prisma.inventory.update({
			where: { id: request.inventoryId },
			data: {
				quantity: {
					decrement: request.quantity,
				},
			},
		});

		// Create a transaction record for the request
		await prisma.inventoryTransaction.create({
			data: {
				inventoryId: request.inventoryId,
				quantity: request.quantity,
				transactionType: "REQUEST",
				notes: `Approved request #${request.id} for ${request.employee.fullName}${approver ? ` (approved by ${approver.fullName})` : ""}`,
				employeeId: request.employeeId,
			},
		});

		// Credit the employee's personal inventory balance
		await prisma.employeeInventory.upsert({
			where: {
				employeeId_inventoryId: {
					employeeId: request.employeeId,
					inventoryId: request.inventoryId,
				},
			},
			update: { quantity: { increment: request.quantity } },
			create: {
				employeeId: request.employeeId,
				inventoryId: request.inventoryId,
				quantity: request.quantity,
			},
		});

		// Update the request to APPROVED
		const updatedRequest = await prisma.inventoryRequest.update({
			where: { id: requestId },
			data: {
				status: "APPROVED",
				approvedBy: Number(approverId),
				approvedAt: new Date(),
			},
			include: {
				inventory: true,
				employee: true,
				approver: true,
			},
		});

		revalidatePath("/dashboard/inventory_manager/employees/requests");
		return updatedRequest;
	} catch (error) {
		console.error("Error approving inventory request:", error);
		throw error;
	}
}

export async function rejectInventoryRequest(requestId: number, approverId: number, rejectionReason?: string) {
	try {
		const request = await prisma.inventoryRequest.findUnique({
			where: { id: requestId },
		});

		if (!request) {
			throw new Error("Request not found");
		}

		if (request.status !== "PENDING") {
			throw new Error("Only pending requests can be rejected");
		}

		// Update the request to REJECTED
		const updatedRequest = await prisma.inventoryRequest.update({
			where: { id: requestId },
			data: {
				status: "REJECTED",
				approvedBy: Number(approverId),
				approvedAt: new Date(),
				notes: rejectionReason ? `REJECTION: ${rejectionReason}` : undefined,
			},
			include: {
				inventory: true,
				employee: true,
				approver: true,
			},
		});

		revalidatePath("/dashboard/inventory_manager/employees/requests");
		return updatedRequest;
	} catch (error) {
		console.error("Error rejecting inventory request:", error);
		throw error;
	}
}
