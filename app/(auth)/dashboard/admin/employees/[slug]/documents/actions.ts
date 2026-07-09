"use server";

import { z } from "zod";
import path from "path";
import { nanoid } from "nanoid";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import supabaseAdminClient from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log";

const SUPABASE_BASE_URL = "https://koxptzqfmeasndsaecyo.supabase.co";
const BUCKET = "employee-documents";

const documentSchema = z.object({
	id: z.coerce.number().int().positive().optional().or(z.literal("")),
	userId: z.coerce.number().int().positive(),
	type: z.enum(["PASSPORT", "VISA", "EMIRATES_ID", "JOB_CONTRACT", "LABOUR_CARD", "OTHER"]),
	title: z.string().max(100).optional().or(z.literal("")),
	documentNumber: z.string().max(100).optional().or(z.literal("")),
	expiryDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional()
		.or(z.literal("")),
	notes: z.string().max(500).optional().or(z.literal("")),
});

async function requireAdmin() {
	const session = await auth();
	if (!session?.user?.id || (session.user as any).role !== "ADMIN") return null;
	return { id: Number(session.user.id), name: session.user.name ?? "Admin" };
}

export async function saveEmployeeDocument(formData: FormData) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can manage documents." };

	const parsed = documentSchema.safeParse({
		id: formData.get("id") ?? "",
		userId: formData.get("userId"),
		type: formData.get("type"),
		title: formData.get("title") ?? "",
		documentNumber: formData.get("documentNumber") ?? "",
		expiryDate: formData.get("expiryDate") ?? "",
		notes: formData.get("notes") ?? "",
	});
	if (!parsed.success) {
		return { success: false, message: `Validation error: ${parsed.error.errors.map((e) => e.message).join("; ")}` };
	}
	const d = parsed.data;

	if (d.type === "OTHER" && !d.title) {
		return { success: false, message: "A title is required for 'Other' documents." };
	}

	const employee = await prismaClient.user.findUnique({
		where: { id: d.userId, role: { in: ["EMPLOYEE", "INVENTORY_MANAGER"] } },
		select: { id: true, fullName: true },
	});
	if (!employee) return { success: false, message: "Employee not found." };

	// Optional file upload (image or PDF scan)
	let fileUrl: string | undefined;
	const file = formData.get("file") as File | null;
	if (file && file.size > 0) {
		const maxSize = 5 * 1024 * 1024;
		const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
		if (!allowedTypes.includes(file.type) || file.size > maxSize) {
			return { success: false, message: "Invalid file. Max size 5MB; JPEG, PNG or PDF." };
		}
		const extension = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
		const uploadPath = path.posix.join(String(d.userId), `${nanoid()}${extension}`);
		const { data, error } = await supabaseAdminClient.storage.from(BUCKET).upload(uploadPath, file, { upsert: false });
		if (error) {
			console.error("Error uploading document to Supabase:", error);
			return { success: false, message: "Failed to upload the file. Please try again." };
		}
		fileUrl = `${SUPABASE_BASE_URL}/storage/v1/object/public/${BUCKET}/${data.path}`;
	}

	const data = {
		type: d.type,
		title: d.title || null,
		documentNumber: d.documentNumber || null,
		expiryDate: d.expiryDate || null,
		notes: d.notes || null,
		...(fileUrl ? { fileUrl } : {}),
	};

	try {
		let docId: number;
		if (d.id) {
			const existing = await prismaClient.employeeDocument.findUnique({ where: { id: Number(d.id) } });
			if (!existing || existing.userId !== d.userId) return { success: false, message: "Document not found." };
			await prismaClient.employeeDocument.update({ where: { id: Number(d.id) }, data });
			docId = Number(d.id);
		} else {
			const created = await prismaClient.employeeDocument.create({ data: { userId: d.userId, ...data } });
			docId = created.id;
		}

		await logActivity({
			actorId: admin.id,
			targetUserId: d.userId,
			action: d.id ? "DOCUMENT_UPDATE" : "DOCUMENT_CREATE",
			entityType: "EmployeeDocument",
			entityId: docId,
			details: `${admin.name} ${d.id ? "updated" : "added"} ${d.type}${d.expiryDate ? ` (expires ${d.expiryDate})` : ""} for ${employee.fullName}`,
		});

		revalidatePath(`/dashboard/admin/employees/${d.userId}/documents`);
		revalidatePath("/dashboard/admin/hr/alerts");
		return { success: true, message: d.id ? "Document updated." : "Document added." };
	} catch (error) {
		console.error("Error saving document:", error);
		return { success: false, message: "Failed to save document. Please try again." };
	}
}

export async function deleteEmployeeDocument(documentId: number) {
	const admin = await requireAdmin();
	if (!admin) return { success: false, message: "Only admins can delete documents." };

	try {
		const doc = await prismaClient.employeeDocument.findUnique({
			where: { id: documentId },
			include: { user: { select: { fullName: true } } },
		});
		if (!doc) return { success: false, message: "Document not found." };

		await prismaClient.employeeDocument.delete({ where: { id: documentId } });

		await logActivity({
			actorId: admin.id,
			targetUserId: doc.userId,
			action: "DOCUMENT_DELETE",
			entityType: "EmployeeDocument",
			entityId: documentId,
			details: `${admin.name} deleted ${doc.type} of ${doc.user.fullName}`,
		});

		revalidatePath(`/dashboard/admin/employees/${doc.userId}/documents`);
		revalidatePath("/dashboard/admin/hr/alerts");
		return { success: true, message: "Document deleted." };
	} catch (error) {
		console.error("Error deleting document:", error);
		return { success: false, message: "Failed to delete document. Please try again." };
	}
}
