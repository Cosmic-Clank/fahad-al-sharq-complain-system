import prismaClient from "./prisma";

export interface ActivityLogInput {
	actorId?: number | null;
	targetUserId?: number | null;
	action: string; // e.g. "INVENTORY_RESTOCK", "ATTENDANCE_UPSERT"
	entityType: string; // e.g. "Inventory", "AttendanceRecord"
	entityId?: number | null;
	details?: string | null; // human-readable; include name snapshots so logs survive user deletion
}

/**
 * Write an activity-log entry. Never throws — logging must not break the
 * action being logged. Call from server actions after a successful write.
 */
export async function logActivity(input: ActivityLogInput): Promise<void> {
	try {
		await prismaClient.activityLog.create({
			data: {
				actorId: input.actorId ?? null,
				targetUserId: input.targetUserId ?? null,
				action: input.action,
				entityType: input.entityType,
				entityId: input.entityId ?? null,
				details: input.details ?? null,
			},
		});
	} catch (error) {
		console.error("Failed to write activity log:", error);
	}
}
