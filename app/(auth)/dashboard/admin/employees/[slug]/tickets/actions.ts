"use server";

import { z } from "zod";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";
import { round2 } from "@/lib/hr-payroll";

const ticketSchema = z.object({
	id: z.coerce.number().int().positive().optional().or(z.literal("")),
	userId: z.coerce.number().int().positive(),
	year: z.coerce.number().int().min(2000).max(2100),
	destination: z.string().min(1, "Destination is required").max(200),
	// preprocess: "" must become undefined (z.coerce.number turns "" into 0)
	value: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().min(0).optional()),
	notes: z.string().max(500).optional().or(z.literal("")),
});

async function requireAdmin() {
	const session = await auth();
	if (!session?.user?.id || (session.user as any).role !== "ADMIN") return null;
	return { id: Number(session.user.id), name: session.user.name ?? "Admin" };
}

export async function saveAirlineTicket(formData: FormData) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can manage tickets." };

	const parsed = ticketSchema.safeParse({
		id: formData.get("id") ?? "",
		userId: formData.get("userId"),
		year: formData.get("year"),
		destination: formData.get("destination"),
		value: formData.get("value") ?? "",
		notes: formData.get("notes") ?? "",
	});
	if (!parsed.success) return { success: false, message: `Validation error: ${parsed.error.errors.map((e) => e.message).join("; ")}` };
	const d = parsed.data;

	const employee = await prismaClient.user.findUnique({
		where: { id: d.userId, role: { in: ["EMPLOYEE", "INVENTORY_MANAGER"] } },
		select: { fullName: true },
	});
	if (!employee) return { success: false, message: "Employee not found." };

	const data = {
		year: d.year,
		destination: d.destination,
		value: d.value === undefined ? null : round2(d.value),
		notes: d.notes || null,
	};

	try {
		let ticketId: number;
		if (d.id) {
			const existing = await prismaClient.airlineTicket.findUnique({ where: { id: Number(d.id) } });
			if (!existing || existing.userId !== d.userId) return { success: false, message: "Ticket not found." };
			await prismaClient.airlineTicket.update({ where: { id: Number(d.id) }, data });
			ticketId = Number(d.id);
		} else {
			const created = await prismaClient.airlineTicket.create({ data: { userId: d.userId, ...data } });
			ticketId = created.id;
		}

		await logActivity({
			actorId: admin.id,
			targetUserId: d.userId,
			action: d.id ? "TICKET_UPDATE" : "TICKET_CREATE",
			entityType: "AirlineTicket",
			entityId: ticketId,
			details: `${admin.name} ${d.id ? "updated" : "added"} airline ticket ${d.year} → ${d.destination} for ${employee.fullName}`,
		});

		revalidatePath(`/dashboard/admin/employees/${d.userId}/tickets`);
		return { success: true, message: d.id ? "Ticket updated." : "Ticket added." };
	} catch (error) {
		console.error("Error saving ticket:", error);
		return { success: false, message: "Failed to save ticket. Please try again." };
	}
}

export async function deleteAirlineTicket(ticketId: number) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can delete tickets." };

	try {
		const ticket = await prismaClient.airlineTicket.findUnique({
			where: { id: ticketId },
			include: { user: { select: { fullName: true } } },
		});
		if (!ticket) return { success: false, message: "Ticket not found." };

		await prismaClient.airlineTicket.delete({ where: { id: ticketId } });

		await logActivity({
			actorId: admin.id,
			targetUserId: ticket.userId,
			action: "TICKET_DELETE",
			entityType: "AirlineTicket",
			entityId: ticketId,
			details: `${admin.name} deleted airline ticket ${ticket.year} → ${ticket.destination} of ${ticket.user.fullName}`,
		});

		revalidatePath(`/dashboard/admin/employees/${ticket.userId}/tickets`);
		return { success: true, message: "Ticket deleted." };
	} catch (error) {
		console.error("Error deleting ticket:", error);
		return { success: false, message: "Failed to delete ticket." };
	}
}
