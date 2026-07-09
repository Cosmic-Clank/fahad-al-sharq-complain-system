"use server";

import { z } from "zod";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";

export async function requestMyPassport(formData: FormData) {
	const session = await auth();
	if (!session?.user?.id) return { success: false, message: "Please log in." };
	const userId = Number(session.user.id);

	const parsed = z
		.object({ reason: z.string().min(3, "Please give a short reason").max(500) })
		.safeParse({ reason: formData.get("reason") });
	if (!parsed.success) return { success: false, message: parsed.error.errors[0].message };

	const open = await prismaClient.passportHandover.findFirst({
		where: { userId, status: { in: ["REQUESTED", "APPROVED", "HANDED_OVER"] } },
	});
	if (open) {
		return { success: false, message: open.status === "HANDED_OVER" ? "You currently have your passport — return it before requesting again." : "You already have a pending request." };
	}

	try {
		const handover = await prismaClient.passportHandover.create({
			data: { userId, status: "REQUESTED", requestReason: parsed.data.reason },
		});
		await logActivity({
			actorId: userId,
			targetUserId: userId,
			action: "HANDOVER_REQUEST",
			entityType: "PassportHandover",
			entityId: handover.id,
			details: `${session.user.name ?? "Employee"} requested their passport: ${parsed.data.reason}`,
		});
		revalidatePath("/dashboard/employee/passport");
		revalidatePath(`/dashboard/admin/employees/${userId}/handovers`);
		revalidatePath("/dashboard/admin/hr/alerts");
		return { success: true, message: "Request submitted — the admin will review it." };
	} catch (error) {
		console.error("Error requesting passport:", error);
		return { success: false, message: "Failed to submit request. Please try again." };
	}
}
