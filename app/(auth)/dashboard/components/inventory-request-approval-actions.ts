"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/authz";
import { QTY_EPSILON } from "@/lib/inventory-units";

const APPROVER_ROLES = ["ADMIN", "INVENTORY_MANAGER"] as const;

export type ApprovalResult = { success: true; message: string } | { success: false; message: string };

/** All inventory requests, newest first (approvers only). */
export async function getAllInventoryRequests() {
	if (!(await requireRole([...APPROVER_ROLES]))) return [];
	try {
		return await prisma.inventoryRequest.findMany({
			include: {
				inventory: true,
				employee: { select: { id: true, fullName: true, username: true } },
				approver: { select: { id: true, fullName: true, username: true } },
			},
			orderBy: { createdAt: "desc" },
		});
	} catch (error) {
		console.error("Error fetching inventory requests:", error);
		throw new Error("Failed to fetch inventory requests");
	}
}

function revalidateRequests() {
	revalidatePath("/dashboard/inventory_manager/employees/requests");
	revalidatePath("/dashboard/admin/inventory/requests");
	revalidatePath("/dashboard/employee/inventory");
	revalidatePath("/dashboard/employee/my-inventory");
}

class InsufficientStockError extends Error {}

/**
 * Approve a pending request: move the quantity from store stock into the
 * employee's stock. Runs in one transaction and only claims the request while
 * it is still PENDING, so a double click or two approvers can't approve twice,
 * and stock is only decremented while enough remains.
 * `_approverId` is ignored — the logged-in user is the approver.
 */
export async function approveInventoryRequest(requestId: number, _approverId?: number): Promise<ApprovalResult> {
	const actor = await requireRole([...APPROVER_ROLES]);
	if (!actor) return { success: false, message: "Unauthorized. Please log in." };

	try {
		const outcome = await prisma.$transaction(async (tx) => {
			const request = await tx.inventoryRequest.findUnique({
				where: { id: requestId },
				include: { inventory: { select: { itemName: true } }, employee: { select: { fullName: true } } },
			});
			if (!request) return { ok: false as const, message: "Inventory request not found." };

			const claimed = await tx.inventoryRequest.updateMany({
				where: { id: requestId, status: "PENDING" },
				data: { status: "APPROVED", approvedBy: actor.id, approvedAt: new Date() },
			});
			if (claimed.count !== 1) return { ok: false as const, message: "Only pending requests can be approved or rejected." };

			const taken = await tx.inventory.updateMany({
				where: { id: request.inventoryId, quantity: { gte: request.quantity - QTY_EPSILON } },
				data: { quantity: { decrement: request.quantity } },
			});
			if (taken.count !== 1) throw new InsufficientStockError(); // rolls back the claim

			await tx.inventoryTransaction.create({
				data: {
					inventoryId: request.inventoryId,
					quantity: request.quantity,
					transactionType: "REQUEST",
					notes: `Approved request #${request.id} for ${request.employee.fullName} (approved by ${actor.name})`,
					employeeId: request.employeeId,
				},
			});
			await tx.employeeInventory.upsert({
				where: { employeeId_inventoryId: { employeeId: request.employeeId, inventoryId: request.inventoryId } },
				update: { quantity: { increment: request.quantity } },
				create: { employeeId: request.employeeId, inventoryId: request.inventoryId, quantity: request.quantity },
			});
			return { ok: true as const, request };
		});

		if (!outcome.ok) return { success: false, message: outcome.message };

		const { request } = outcome;
		await logActivity({
			actorId: actor.id,
			targetUserId: request.employeeId,
			action: "INVENTORY_REQUEST_APPROVE",
			entityType: "InventoryRequest",
			entityId: requestId,
			details: `${actor.name} approved request #${requestId}: ${request.quantity} of "${request.inventory.itemName}" for ${request.employee.fullName}`,
		});
		revalidateRequests();
		return { success: true, message: "Inventory request approved." };
	} catch (error) {
		if (error instanceof InsufficientStockError) {
			return { success: false, message: "Not enough stock to approve this request." };
		}
		console.error("Error approving inventory request:", error);
		return { success: false, message: "Failed to approve the request. Please try again." };
	}
}

/**
 * Reject a pending request. The reason is added to the request's notes
 * (the employee's own notes are kept). `_approverId` is ignored.
 */
export async function rejectInventoryRequest(requestId: number, _approverId?: number, rejectionReason?: string): Promise<ApprovalResult> {
	const actor = await requireRole([...APPROVER_ROLES]);
	if (!actor) return { success: false, message: "Unauthorized. Please log in." };

	const reason = rejectionReason?.trim().slice(0, 500) || "";
	try {
		const request = await prisma.inventoryRequest.findUnique({
			where: { id: requestId },
			include: { employee: { select: { fullName: true } } },
		});
		if (!request) return { success: false, message: "Inventory request not found." };

		const rejectionNote = reason ? `REJECTION: ${reason}` : null;
		const claimed = await prisma.inventoryRequest.updateMany({
			where: { id: requestId, status: "PENDING" },
			data: {
				status: "REJECTED",
				approvedBy: actor.id,
				approvedAt: new Date(),
				...(rejectionNote ? { notes: request.notes ? `${request.notes}\n${rejectionNote}` : rejectionNote } : {}),
			},
		});
		if (claimed.count !== 1) return { success: false, message: "Only pending requests can be approved or rejected." };

		await logActivity({
			actorId: actor.id,
			targetUserId: request.employeeId,
			action: "INVENTORY_REQUEST_REJECT",
			entityType: "InventoryRequest",
			entityId: requestId,
			details: `${actor.name} rejected request #${requestId} of ${request.employee.fullName}${reason ? `: ${reason}` : ""}`,
		});
		revalidateRequests();
		return { success: true, message: "Inventory request rejected." };
	} catch (error) {
		console.error("Error rejecting inventory request:", error);
		return { success: false, message: "Failed to reject the request. Please try again." };
	}
}
