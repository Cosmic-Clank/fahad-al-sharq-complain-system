"use server";

import { z } from "zod";
import prismaClient from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { logActivity } from "@/lib/activity-log";
import { round2 } from "@/lib/hr-payroll";

/** Largest charge accepted for one job (guards against typos like extra zeros). */
const MAX_CHARGE = 1_000_000;

const chargeSchema = z.object({
	complaintId: z.number({ invalid_type_error: "Complaint not found." }).int("Complaint not found.").positive("Complaint not found."),
	// null clears the amount
	amount: z.number({ invalid_type_error: "Enter the amount charged in AED." }).finite("Enter the amount charged in AED.").min(0, "The amount can't be negative.").max(MAX_CHARGE, "That amount looks too high. Please check it.").nullable(),
});

/** Admin records (or clears) what the customer was charged for a private job. */
export async function setComplaintCharge(complaintId: number, amount: number | null): Promise<{ success: boolean; message: string }> {
	const admin = await requireRole(["ADMIN"]);
	if (!admin) return { success: false, message: "Only admins can record charges." };

	const parsed = chargeSchema.safeParse({ complaintId, amount });
	if (!parsed.success) return { success: false, message: parsed.error.errors[0].message };
	const d = parsed.data;

	const complaint = await prismaClient.complaint.findUnique({ where: { id: d.complaintId }, select: { id: true, isPrivate: true, chargedAmount: true } });
	if (!complaint) return { success: false, message: "Complaint not found." };
	if (!complaint.isPrivate) return { success: false, message: "Charges are only recorded on private complaints." };

	const value = d.amount === null ? null : round2(d.amount);
	await prismaClient.complaint.update({
		where: { id: d.complaintId },
		data: value === null ? { chargedAmount: null, chargedAt: null, chargedByName: null } : { chargedAmount: value, chargedAt: new Date(), chargedByName: admin.name },
	});

	await logActivity({
		actorId: admin.id,
		action: value === null ? "COMPLAINT_CHARGE_CLEAR" : "COMPLAINT_CHARGE_SET",
		entityType: "Complaint",
		entityId: d.complaintId,
		details:
			value === null
				? `${admin.name} cleared the charge on private complaint #${d.complaintId}`
				: `${admin.name} recorded a charge of ${value} AED on private complaint #${d.complaintId}${complaint.chargedAmount !== null ? ` (was ${complaint.chargedAmount} AED)` : ""}`,
	});

	revalidatePath(`/dashboard/admin/complaint/${d.complaintId}`);
	revalidatePath("/dashboard/admin/private-earnings");
	return { success: true, message: value === null ? "Charge cleared." : "Charge saved." };
}
