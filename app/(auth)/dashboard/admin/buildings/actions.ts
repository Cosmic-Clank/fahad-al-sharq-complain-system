// components/buildings/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { requireRole } from "@/lib/authz";
import { logActivity } from "@/lib/activity-log";

export async function createBuilding(formData: FormData) {
	if (!(await requireRole(["ADMIN"]))) throw new Error("Only admins can manage buildings.");
	const buildingName = String(formData.get("buildingName") || "").trim();
	const emirate = String(formData.get("emirate") || "").trim();

	if (!buildingName) throw new Error("Building name is required.");
	if (!emirate) throw new Error("Emirate is required.");

	await prisma.buildings.create({
		data: { id: Number(randomUUID().replace(/\D/g, "").slice(0, 8)), buildingName, emirate },
	});

	revalidatePath("/dashboard/admin/buildings");
}

/**
 * Buildings are deactivated, never deleted: complaints, requests and reports refer to them by
 * name. An inactive building no longer appears on the complaint forms or the inventory
 * request form, but stays in history, filters and reports. It can be reactivated any time.
 */
export async function setBuildingActive(id: number, isActive: boolean): Promise<{ success: boolean; message: string }> {
	const admin = await requireRole(["ADMIN"]);
	if (!admin) return { success: false, message: "Only admins can manage buildings." };
	if (!Number.isInteger(id)) return { success: false, message: "Building not found." };

	const updated = await prisma.buildings.updateMany({ where: { id }, data: { isActive } });
	if (updated.count !== 1) return { success: false, message: "Building not found." };

	const building = await prisma.buildings.findUnique({ where: { id }, select: { buildingName: true } });
	await logActivity({
		actorId: admin.id,
		action: isActive ? "BUILDING_REACTIVATE" : "BUILDING_DEACTIVATE",
		entityType: "Buildings",
		entityId: id,
		details: `${admin.name} ${isActive ? "reactivated" : "deactivated"} building "${building?.buildingName ?? id}"`,
	});

	revalidatePath("/dashboard/admin/buildings");
	revalidatePath("/complain");
	revalidatePath("/private-complain");
	revalidatePath("/dashboard/employee/inventory/request");
	return { success: true, message: isActive ? "Building reactivated." : "Building deactivated." };
}
