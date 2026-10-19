// Server-only leave helpers shared by the employee and admin leave actions.
import { inflateSync } from "node:zlib";
import { revalidatePath } from "next/cache";
import prismaClient from "./prisma";
import { leaveDates } from "./hr-leave";

/** A drawn signature from react-signature-canvas (PNG data URL), capped at ~1MB. */
const SIGNATURE_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/=]{100,1400000}$/;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/**
 * True only for a structurally sound PNG. pdf-lib loops forever on a PNG whose
 * header is fine but whose pixel data is corrupt, which would freeze the server
 * when the leave form PDF is exported — so signatures are fully checked before
 * they are stored: sane dimensions, and the compressed data must inflate to
 * exactly the size the header promises.
 */
export function isValidSignature(dataUrl: string | null | undefined): dataUrl is string {
	if (!dataUrl || !SIGNATURE_PATTERN.test(dataUrl)) return false;
	try {
		const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
		if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_MAGIC)) return false;

		let offset = 8;
		let width = 0;
		let height = 0;
		let bitDepth = 0;
		let channels = 0;
		const idat: Buffer[] = [];
		while (offset + 12 <= buf.length) {
			const length = buf.readUInt32BE(offset);
			const type = buf.toString("ascii", offset + 4, offset + 8);
			if (offset + 12 + length > buf.length) return false;
			const data = buf.subarray(offset + 8, offset + 8 + length);
			if (type === "IHDR") {
				width = data.readUInt32BE(0);
				height = data.readUInt32BE(4);
				bitDepth = data[8];
				channels = PNG_CHANNELS[data[9]] ?? 0;
				if (data[12] !== 0) return false; // interlaced — canvas never produces it
			} else if (type === "IDAT") {
				idat.push(data);
			} else if (type === "IEND") {
				break;
			}
			offset += 12 + length;
		}
		if (!width || !height || width > 4000 || height > 4000 || !channels || ![1, 2, 4, 8, 16].includes(bitDepth) || idat.length === 0) return false;

		const expected = height * (1 + Math.ceil((width * channels * bitDepth) / 8));
		const raw = inflateSync(Buffer.concat(idat), { maxOutputLength: expected + 1 });
		return raw.length === expected;
	} catch {
		return false;
	}
}

/** Pending or approved leave of this employee that shares a day with the range (optionally ignoring one request). */
export function findOverlappingLeave(userId: number, startDate: string, endDate: string, ignoreId?: number) {
	return prismaClient.leaveRequest.findFirst({
		where: {
			userId,
			status: { in: ["PENDING", "APPROVED"] },
			startDate: { lte: endDate },
			endDate: { gte: startDate },
			...(ignoreId ? { id: { not: ignoreId } } : {}),
		},
		select: { id: true },
	});
}

export function revalidateLeave(userId: number) {
	revalidatePath("/dashboard/employee/leave");
	revalidatePath(`/dashboard/admin/employees/${userId}/leave`);
	revalidatePath(`/dashboard/hr_manager/employees/${userId}/leave`);
	revalidatePath("/dashboard/admin/hr/leave");
	revalidatePath("/dashboard/hr_manager/leave");
	revalidatePath("/dashboard/admin/hr/attendance");
	revalidatePath("/dashboard/hr_manager/attendance");
	revalidatePath(`/dashboard/admin/employees/${userId}/attendance`);
	revalidatePath(`/dashboard/hr_manager/employees/${userId}/attendance`);
}

/** Leave requests serialized for LeaveSection (dates as display strings, signatures as booleans). */
export async function getLeaveRows(where: { userId?: number; status?: "PENDING" | { not: "PENDING" } }, take = 100) {
	const rows = await prismaClient.leaveRequest.findMany({
		where,
		orderBy: [{ startDate: "desc" }, { id: "desc" }],
		take,
		select: {
			id: true,
			userId: true,
			type: true,
			startDate: true,
			endDate: true,
			days: true,
			reason: true,
			status: true,
			signatureRequired: true,
			createdByAdminName: true,
			createdAt: true,
			decidedAt: true,
			decidedByName: true,
			decisionNote: true,
			user: { select: { fullName: true } },
		},
	});
	// Signatures are large base64 images — only fetch which rows have them
	const ids = rows.map((r) => r.id);
	const [empSigned, adminSigned] = await Promise.all([
		prismaClient.leaveRequest.findMany({ where: { id: { in: ids }, employeeSignatureBase64: { not: null } }, select: { id: true } }),
		prismaClient.leaveRequest.findMany({ where: { id: { in: ids }, adminSignatureBase64: { not: null } }, select: { id: true } }),
	]);
	const empSet = new Set(empSigned.map((r) => r.id));
	const adminSet = new Set(adminSigned.map((r) => r.id));
	const fmt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "short" });
	return rows.map((r) => ({
		id: r.id,
		userId: r.userId,
		employeeName: r.user.fullName,
		type: r.type,
		startDate: r.startDate,
		endDate: r.endDate,
		days: r.days,
		reason: r.reason,
		status: r.status,
		signatureRequired: r.signatureRequired,
		hasEmployeeSignature: empSet.has(r.id),
		hasAdminSignature: adminSet.has(r.id),
		createdByAdminName: r.createdByAdminName,
		requestedAt: fmt(r.createdAt),
		decidedAt: r.decidedAt ? fmt(r.decidedAt) : null,
		decidedByName: r.decidedByName,
		decisionNote: r.decisionNote,
	}));
}

/**
 * Approved leave days within a "YYYY-MM" month, keyed `${userId}|${date}` → leave type.
 * Used to mark leave on the attendance sheet, employee tab and exports.
 */
export async function getApprovedLeaveDays(month: string, userId?: number): Promise<Record<string, string>> {
	const monthStart = `${month}-01`;
	const monthEnd = `${month}-31`; // string compare: any real day of the month is <= "-31"
	const leaves = await prismaClient.leaveRequest.findMany({
		where: { status: "APPROVED", startDate: { lte: monthEnd }, endDate: { gte: monthStart }, ...(userId ? { userId } : {}) },
		select: { userId: true, type: true, startDate: true, endDate: true },
	});
	const days: Record<string, string> = {};
	for (const l of leaves) {
		for (const date of leaveDates(l.startDate, l.endDate)) {
			if (date.startsWith(month)) days[`${l.userId}|${date}`] = l.type;
		}
	}
	return days;
}
