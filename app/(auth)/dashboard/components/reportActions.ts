// components/reportActions.ts
"use server";

import prisma from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Buffer } from "node:buffer";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ComplaintColumn = "customerName" | "customerEmail" | "customerPhone" | "customerAddress" | "buildingName" | "apartmentNumber";

export type PreviewCriterion = ComplaintColumn | "createdAt";

const ALLOWED = new Set<ComplaintColumn>(["customerName", "customerEmail", "customerPhone", "customerAddress", "buildingName", "apartmentNumber"]);

export type UniqueOption = { value: string; label: string };

export type ComplaintPreviewRow = {
	id: string;
	customerName: string;
	customerEmail: string | null;
	customerPhone: string;
	customerAddress: string;
	buildingName: string;
	apartmentNumber: string | null;
	description?: string | null;
	createdAt: string; // ISO
	images?: string[]; // normalized full URLs (built from imagePaths)
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const CRITERION_LABEL: Record<PreviewCriterion, string> = {
	customerName: "Customer Name",
	customerEmail: "Customer Email",
	customerPhone: "Customer Phone",
	customerAddress: "Customer Address",
	buildingName: "Building Name",
	apartmentNumber: "Apartment Number",
	createdAt: "Created At (Date Range)",
};

function fmtDubai(d: Date) {
	return new Intl.DateTimeFormat("en-GB", {
		timeZone: "Asia/Dubai",
		dateStyle: "medium",
		timeStyle: "short",
	}).format(d);
}

function toUtcDayRange(startDate: string, endDate: string) {
	const start = new Date(`${startDate}T00:00:00.000Z`);
	const endExclusive = new Date(`${endDate}T00:00:00.000Z`);
	endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
	return { start, endExclusive };
}

// Build full Supabase public URL(s) from DB value (string | string[] | CSV)
function normalizeImagePaths(raw: unknown): string[] {
	const base = "https://koxptzqfmeasndsaecyo.supabase.co/storage/v1/object/public/complaint-images";
	if (!raw) return [];
	if (Array.isArray(raw))
		return raw
			.map(String)
			.filter(Boolean)
			.map((p) => `${base}/${p}`);
	if (typeof raw === "string") {
		if (raw.includes(",")) {
			return raw
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
				.map((p) => `${base}/${p}`);
		}
		return [`${base}/${raw}`];
	}
	return [];
}

// Fetch JPG bytes from a public URL (we won't reject png/webp since your store is jpg-only,
// but if content-type isn't available, we'll still try to embed; pdf-lib needs jpg here)
async function fetchJpgBytes(url: string): Promise<Uint8Array | null> {
	try {
		const res = await fetch(url, { cache: "no-store" });
		if (!res.ok) return null;
		const buf = new Uint8Array(await res.arrayBuffer());
		return buf;
	} catch {
		return null;
	}
}

// ─────────────────────────────────────────────────────────────
// Server Actions
// ─────────────────────────────────────────────────────────────

export async function getUniqueOptions(column: ComplaintColumn): Promise<UniqueOption[]> {
	if (!ALLOWED.has(column)) throw new Error("Invalid column");

	const rows = await prisma.complaint.findMany({
		distinct: [column as any],
		select: { [column]: true } as any,
		orderBy: { [column]: "asc" } as any,
	});

	return rows
		.map((r: any) => r[column])
		.filter((v: any) => v !== null && v !== undefined && String(v).trim() !== "")
		.map((v: any) => String(v))
		.filter((v, i, arr) => arr.indexOf(v) === i)
		.map((v) => ({ value: v, label: v }));
}

/**
 * Fetch preview rows from DB.
 * - If criterion is a normal column => exact match on `value`
 * - If criterion is createdAt       => inclusive day range [startDate, endDate]
 */
export async function previewComplaints(params: {
	criterion: PreviewCriterion;
	value?: string;
	startDate?: string; // YYYY-MM-DD
	endDate?: string; // YYYY-MM-DD
	limit?: number; // default 50
}): Promise<ComplaintPreviewRow[]> {
	const { criterion, value, startDate, endDate } = params;
	const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 500);

	let where: any = {};

	if (criterion === "createdAt") {
		if (!startDate || !endDate) throw new Error("startDate and endDate are required for createdAt");
		const { start, endExclusive } = toUtcDayRange(startDate, endDate);
		where = {
			createdAt: {
				gte: start,
				lt: endExclusive,
			},
		};
	} else {
		if (!ALLOWED.has(criterion as ComplaintColumn)) throw new Error("Invalid column");
		if (!value || !String(value).trim()) throw new Error("Value is required for this criterion");
		where = { [criterion]: value };
	}

	const rows = await prisma.complaint.findMany({
		where,
		orderBy: { createdAt: "desc" },
		take: limit,
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			customerPhone: true,
			customerAddress: true,
			buildingName: true,
			apartmentNumber: true,
			description: true,
			createdAt: true,
			imagePaths: true, // <— actual column with relative keys
		},
	});

	return rows.map((r) => ({
		id: String(r.id),
		customerName: r.customerName,
		customerEmail: r.customerEmail,
		customerPhone: r.customerPhone,
		customerAddress: r.customerAddress,
		buildingName: r.buildingName,
		apartmentNumber: r.apartmentNumber,
		description: r.description ?? null,
		createdAt: r.createdAt.toISOString(),
		images: normalizeImagePaths((r as any).imagePaths),
	}));
}

// Internal fetch for PDF (bigger default limit)
async function fetchComplaints(params: { criterion: PreviewCriterion; value?: string; startDate?: string; endDate?: string; limit?: number }): Promise<ComplaintPreviewRow[]> {
	const { criterion, value, startDate, endDate } = params;
	const limit = Math.min(Math.max(Number(params.limit ?? 300), 1), 1000);

	let where: any = {};
	if (criterion === "createdAt") {
		if (!startDate || !endDate) throw new Error("startDate and endDate are required for createdAt");
		const { start, endExclusive } = toUtcDayRange(startDate, endDate);
		where = { createdAt: { gte: start, lt: endExclusive } };
	} else {
		if (!ALLOWED.has(criterion as ComplaintColumn)) throw new Error("Invalid column");
		if (!value || !String(value).trim()) throw new Error("Value is required");
		where = { [criterion]: value };
	}

	const rows = await prisma.complaint.findMany({
		where,
		orderBy: { createdAt: "desc" },
		take: limit,
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			customerPhone: true,
			customerAddress: true,
			buildingName: true,
			apartmentNumber: true,
			description: true,
			createdAt: true,
			imagePaths: true, // <— actual column with relative keys
		},
	});

	return rows.map((r) => ({
		id: String(r.id),
		customerName: r.customerName,
		customerEmail: r.customerEmail,
		customerPhone: r.customerPhone,
		customerAddress: r.customerAddress,
		buildingName: r.buildingName,
		apartmentNumber: r.apartmentNumber,
		description: r.description ?? null,
		createdAt: r.createdAt.toISOString(),
		images: normalizeImagePaths((r as any).imagePaths),
	}));
}

// ─────────────────────────────────────────────────────────────
// PDF generator (pdf-lib) — with JPG images at bottom
// ─────────────────────────────────────────────────────────────
// assumes you already have `prisma` imported and the helper functions available:
// hoursBetween, fmtDubai, normalizeImagePaths, fetchImageBytes, maybeDownscaleJpeg

type ComplaintsPdfResult = { fileName: string; base64: string };

export async function generateComplaintsPdfByFilter(column: string, value: unknown): Promise<ComplaintsPdfResult> {
	// Build dynamic Prisma where clause (simple field equality)
	const where: Record<string, unknown> = { [column]: value };

	const complaints = await prisma.complaint.findMany({
		where,
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			customerPhone: true,
			customerAddress: true,
			buildingName: true,
			apartmentNumber: true,
			description: true,
			imagePaths: true,
			convenientTime: true,
			createdAt: true,
			assignedTo: { select: { fullName: true, username: true } },
			workTimes: {
				select: {
					startTime: true,
					endTime: true,
					user: { select: { fullName: true } },
				},
				orderBy: { startTime: "asc" },
			},
			responses: {
				select: {
					id: true,
					createdAt: true,
					responder: { select: { fullName: true } },
				},
				orderBy: { createdAt: "asc" },
			},
		},
		orderBy: { createdAt: "asc" },
	});

	if (!complaints || complaints.length === 0) {
		throw new Error("No complaints found for the given filter.");
	}

	// ——— PDF setup (A4, same palette/metrics as single-page version) ———
	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	const W = 595.28;
	const H = 841.89;
	const M = 28;
	const LH = 13;

	const ink = rgb(0.1, 0.12, 0.16);
	const subt = rgb(0.42, 0.45, 0.5);
	const chipBg = rgb(0.93, 0.95, 0.98);
	const panel = rgb(1, 1, 1);
	const panelBorder = rgb(0.9, 0.92, 0.94);
	const band = rgb(0.14, 0.44, 0.78);

	const totalPages = complaints.length;

	// Small helpers bound to this document
	const wrap = (t: string, maxW: number, size = 10, f = font) => {
		const words = (t || "").split(/\s+/);
		const lines: string[] = [];
		let line = "";
		for (const w of words) {
			const trial = line ? `${line} ${w}` : w;
			if (f.widthOfTextAtSize(trial, size) > maxW) {
				if (line) lines.push(line);
				line = w;
			} else {
				line = trial;
			}
		}
		if (line) lines.push(line);
		return lines;
	};

	const drawComplaintPage = async (c: (typeof complaints)[number], pageIndex: number) => {
		const page = doc.addPage([W, H]);
		const text = (t: string, x: number, y: number, size = 10, bold = false, color = ink) => {
			page.drawText(t, { x, y, size, font: bold ? fontBold : font, color });
		};

		// Derive completion + metrics (same logic)
		const finishedEntries = c.workTimes.filter((wt) => wt.endTime);
		const isCompleted = finishedEntries.length > 0;
		const latestEnd = isCompleted ? finishedEntries.reduce((max, wt) => (wt.endTime! > max ? wt.endTime! : max), finishedEntries[0].endTime!) : null;

		const completedOn = latestEnd ? new Date(latestEnd) : null;
		const completedBy = completedOn ? c.workTimes.filter((wt) => wt.endTime && wt.endTime.getTime() === completedOn.getTime()).map((wt) => wt.user.fullName)[0] ?? null : null;

		const now = new Date();
		const totalHours = c.workTimes.reduce((sum, wt) => {
			const end = wt.endTime ?? now;
			return sum + hoursBetween(wt.startTime, end);
		}, 0);

		const responsesCount = c.responses.length;
		const firstResponseAt = responsesCount ? c.responses[0].createdAt : null;
		const lastResponseAt = responsesCount ? c.responses[responsesCount - 1].createdAt : null;
		const uniqueResponders = Array.from(new Set(c.responses.map((r) => r.responder.fullName))).join(", ");

		const images = normalizeImagePaths(c.imagePaths);

		// Header band
		page.drawRectangle({ x: 0, y: H - 76, width: W, height: 76, color: band });
		text("Complaint Report", M, H - 38, 20, true, rgb(1, 1, 1));
		text(`#${c.id}`, M, H - 58, 12, false, rgb(1, 1, 1));
		const genAt = fmtDubai(new Date());
		const genStr = `Generated: ${genAt} (Asia/Dubai)`;
		text(genStr, W - M - font.widthOfTextAtSize(genStr, 10), H - 58, 10, false, rgb(1, 1, 1));

		// Chips row
		let chipX = M;
		const chips = [`Created: ${fmtDubai(c.createdAt)}`, c.assignedTo ? `Assigned to: ${c.assignedTo.fullName}` : "Unassigned", isCompleted ? `Completed: ${fmtDubai(completedOn!)}` : "Not completed"];
		const chipH = 18;
		const chipPadX = 6;
		const chipsY = H - 88;
		for (const chip of chips) {
			const cw = font.widthOfTextAtSize(chip, 9) + chipPadX * 2;
			page.drawRectangle({
				x: chipX,
				y: chipsY,
				width: cw,
				height: chipH,
				color: chipBg,
				borderColor: panelBorder,
				borderWidth: 1,
			});
			text(chip, chipX + chipPadX, chipsY + 4, 9, false, ink);
			chipX += cw + 6;
		}

		// Panel: Key details (2 cols)
		const panelTop = H - 112;
		const panelH = 210;
		page.drawRectangle({
			x: M,
			y: panelTop - panelH,
			width: W - 2 * M,
			height: panelH,
			color: panel,
			borderColor: panelBorder,
			borderWidth: 1,
		});

		const colGap = 18;
		const colW = (W - 2 * M - colGap - 24) / 2;
		let y = panelTop - 24;

		const drawField = (label: string, value: string | null, col: 0 | 1) => {
			const x = M + 12 + (col === 1 ? colW + colGap : 0);
			text(label, x, y, 9, false, subt);
			const lines = wrap(value || "—", colW, 10);
			let ly = y - 14;
			for (const ln of lines) {
				text(ln, x, ly, 10);
				ly -= LH;
			}
		};

		// Left column
		drawField("Customer Name", c.customerName, 0);
		y -= 40;
		drawField("Customer Email", c.customerEmail ?? "—", 0);
		y -= 40;
		drawField("Customer Phone", c.customerPhone, 0);
		y -= 40;
		drawField("Convenient Time", String(c.convenientTime).replace(/_/g, " "), 0);
		y -= 40;

		// Right column
		y = panelTop - 24;
		drawField("Address", c.customerAddress, 1);
		y -= 40;
		drawField("Building", c.buildingName, 1);
		y -= 40;
		drawField("Apartment", c.apartmentNumber ?? "—", 1);
		y -= 40;

		// Panel: Progress & responses
		const progTop = panelTop - panelH - 12;
		const progH = 96;
		page.drawRectangle({
			x: M,
			y: progTop - progH,
			width: W - 2 * M,
			height: progH,
			color: panel,
			borderColor: panelBorder,
			borderWidth: 1,
		});

		text("Progress", M + 12, progTop - 18, 11, true);
		let py = progTop - 36;
		const progressPairs: [string, string][] = [
			["Status", isCompleted ? "Completed" : "In Progress"],
			["Total Time", `${totalHours.toFixed(1)} h`],
			["Completed On", completedOn ? fmtDubai(completedOn) : "—"],
			["Completed By", completedBy ?? "—"],
		];
		progressPairs.forEach(([k, v]) => {
			text(k, M + 12, py, 9, false, subt);
			text(v, M + 120, py, 10, true);
			py -= 18;
		});

		const rx = W / 2 + 6;
		text("Responses", rx, progTop - 18, 11, true);
		let ry = progTop - 36;
		const respPairs: [string, string][] = [
			["Count", String(responsesCount)],
			["First", firstResponseAt ? fmtDubai(firstResponseAt) : "—"],
			["Last", lastResponseAt ? fmtDubai(lastResponseAt) : "—"],
			["By", uniqueResponders || "—"],
		];
		respPairs.forEach(([k, v]) => {
			text(k, rx, ry, 9, false, subt);
			const maxW = W - M - rx - 12;
			const lines = wrap(v, maxW, 10);
			let ly = ry;
			for (const ln of lines) {
				text(ln, rx + 80, ly, 10, true);
				ly -= LH;
			}
			ry -= 18;
		});

		// Description panel
		const descTop = progTop - progH - 12;
		const descH = 120;
		page.drawRectangle({
			x: M,
			y: descTop - descH,
			width: W - 2 * M,
			height: descH,
			color: panel,
			borderColor: panelBorder,
			borderWidth: 1,
		});
		text("Description", M + 12, descTop - 18, 11, true);
		if (c.description && c.description.trim()) {
			const lines = wrap(c.description.trim(), W - 2 * M - 24, 10);
			let dy = descTop - 36;
			for (const ln of lines) {
				text(ln, M + 12, dy, 10);
				dy -= LH;
				if (dy < M + 80) break;
			}
		} else {
			text("—", M + 12, descTop - 36, 10, false, subt);
		}

		// Images (compact grid)
		const imgsTop = descTop - descH - 12;
		page.drawRectangle({
			x: M,
			y: M + 70,
			width: W - 2 * M,
			height: imgsTop - (M + 70),
			color: panel,
			borderColor: panelBorder,
			borderWidth: 1,
		});
		text(`Images (${images.length})`, M + 12, imgsTop - 18, 11, true);

		if (images.length > 0) {
			const pad = 10;
			const thumbW = (W - 2 * M - 24 - pad * 2) / 3;
			const thumbH = 110;
			let ix = M + 12,
				iy = imgsTop - 36 - thumbH;

			for (let i = 0; i < images.length; i++) {
				const raw = await fetchImageBytes(images[i]);
				if (!raw) continue;
				const down = await maybeDownscaleJpeg(raw, 900, 900);
				const jpg = await doc.embedJpg(down);
				const scale = Math.min(thumbW / jpg.width, thumbH / jpg.height);
				const w = jpg.width * scale;
				const h = jpg.height * scale;

				page.drawImage(jpg, { x: ix, y: Math.max(M + 76, iy), width: w, height: h });
				text(`Image ${i + 1}`, ix, Math.max(M + 64, iy - 10), 8, false, subt);

				ix += thumbW + pad;
				if (ix + thumbW > W - M - 12) {
					ix = M + 12;
					iy -= thumbH + 34;
					if (iy < M + 90) break;
				}
			}
		} else {
			text("No images attached.", M + 12, imgsTop - 36, 10, false, subt);
		}

		// Footer with proper page numbers
		const footerLeft = `Complaint #${c.id}`;
		const footerRight = `Page ${pageIndex + 1} of ${totalPages}`;
		text(footerLeft, M, 40, 9, false, subt);
		text(footerRight, W - M - font.widthOfTextAtSize(footerRight, 9), 40, 9, false, subt);
	};

	// Render each complaint on its own page
	for (let i = 0; i < complaints.length; i++) {
		// eslint-disable-next-line no-await-in-loop
		await drawComplaintPage(complaints[i], i);
	}

	const bytes = await doc.save();
	const base64 = Buffer.from(bytes).toString("base64");

	// Nice-ish filename
	const safeVal = typeof value === "string" ? value.replace(/[^\w.-]+/g, "_").slice(0, 40) : String(value);
	const fileName = `complaints_${column}_${safeVal}.pdf`;

	return { fileName, base64 };
}

/** Fetch JPG/PNG bytes; returns Uint8Array or null */
async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
	try {
		const res = await fetch(url, { cache: "no-store" });
		if (!res.ok) return null;
		return new Uint8Array(await res.arrayBuffer());
	} catch {
		return null;
	}
}

/**
 * Optionally downscale image bytes using sharp if present.
 * This keeps PDFs much smaller on serverless (no-op if sharp isn't installed).
 */
async function maybeDownscaleJpeg(bytes: Uint8Array, maxW = 900, maxH = 900): Promise<Uint8Array> {
	try {
		// dynamic import so function still works if sharp isn't installed
		const sharpMod = await import("sharp").catch(() => null as any);
		if (!sharpMod?.default) return bytes;
		const sharp = sharpMod.default;
		const out = await sharp(bytes).rotate().resize({ width: maxW, height: maxH, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
		return new Uint8Array(out);
	} catch {
		return bytes; // fall back
	}
}

function hoursBetween(a: Date, b: Date) {
	const ms = b.getTime() - a.getTime();
	return Math.max(0, ms / (1000 * 60 * 60));
}

export async function generateComplaintPdfById(complaintId: string): Promise<{ fileName: string; base64: string }> {
	const id = Number(complaintId);

	// Pull richer info
	const complaint = await prisma.complaint.findUnique({
		where: { id },
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			customerPhone: true,
			customerAddress: true,
			buildingName: true,
			apartmentNumber: true,
			description: true,
			imagePaths: true,
			convenientTime: true,
			createdAt: true,
			assignedTo: { select: { fullName: true, username: true } },
			workTimes: {
				select: {
					startTime: true,
					endTime: true,
					user: { select: { fullName: true } },
				},
				orderBy: { startTime: "asc" },
			},
			responses: {
				select: {
					id: true,
					createdAt: true,
					responder: { select: { fullName: true } },
				},
				orderBy: { createdAt: "asc" },
			},
		},
	});

	if (!complaint) throw new Error("Complaint not found");

	// Derive completion + metrics
	const finishedEntries = complaint.workTimes.filter((wt) => wt.endTime);
	const isCompleted = finishedEntries.length > 0;
	const latestEnd = isCompleted ? finishedEntries.reduce((max, wt) => (wt.endTime! > max ? wt.endTime! : max), finishedEntries[0].endTime!) : null;

	const completedOn = latestEnd ? new Date(latestEnd) : null;
	const completedBy = completedOn ? complaint.workTimes.filter((wt) => wt.endTime && wt.endTime.getTime() === completedOn.getTime()).map((wt) => wt.user.fullName)[0] ?? null : null;

	// total hours (use now for any open shifts)
	const now = new Date();
	const totalHours = complaint.workTimes.reduce((sum, wt) => {
		const end = wt.endTime ?? now;
		return sum + hoursBetween(wt.startTime, end);
	}, 0);

	const responsesCount = complaint.responses.length;
	const firstResponseAt = responsesCount ? complaint.responses[0].createdAt : null;
	const lastResponseAt = responsesCount ? complaint.responses[responsesCount - 1].createdAt : null;
	const uniqueResponders = Array.from(new Set(complaint.responses.map((r) => r.responder.fullName))).join(", ");

	const images = normalizeImagePaths(complaint.imagePaths);

	// ——— PDF (compact, nicer) ———
	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	// A4
	const W = 595.28;
	const H = 841.89;
	const M = 28;
	const LH = 13;

	// palette
	const ink = rgb(0.1, 0.12, 0.16);
	const subt = rgb(0.42, 0.45, 0.5);
	const chipBg = rgb(0.93, 0.95, 0.98);
	const panel = rgb(1, 1, 1);
	const panelBorder = rgb(0.9, 0.92, 0.94);
	const band = rgb(0.14, 0.44, 0.78);

	const page = doc.addPage([W, H]);

	const text = (t: string, x: number, y: number, size = 10, bold = false, color = ink) => {
		page.drawText(t, { x, y, size, font: bold ? fontBold : font, color });
	};

	const wrap = (t: string, maxW: number, size = 10, f = font) => {
		const words = (t || "").split(/\s+/);
		const lines: string[] = [];
		let line = "";
		for (const w of words) {
			const trial = line ? `${line} ${w}` : w;
			if (f.widthOfTextAtSize(trial, size) > maxW) {
				if (line) lines.push(line);
				line = w;
			} else line = trial;
		}
		if (line) lines.push(line);
		return lines;
	};

	// Header band
	page.drawRectangle({ x: 0, y: H - 76, width: W, height: 76, color: band });
	text("Complaint Report", M, H - 38, 20, true, rgb(1, 1, 1));
	text(`#${complaint.id}`, M, H - 58, 12, false, rgb(1, 1, 1));
	const genAt = fmtDubai(new Date());
	text(`Generated: ${genAt} (Asia/Dubai)`, W - M - font.widthOfTextAtSize(`Generated: ${genAt} (Asia/Dubai)`, 10), H - 58, 10, false, rgb(1, 1, 1));

	// Chips row
	let chipX = M;
	const chips = [`Created: ${fmtDubai(complaint.createdAt)}`, complaint.assignedTo ? `Assigned to: ${complaint.assignedTo.fullName}` : "Unassigned", isCompleted ? `Completed: ${fmtDubai(completedOn!)}` : "Not completed"];
	const chipH = 18,
		chipPadX = 6;
	const chipsY = H - 88;
	for (const c of chips) {
		const cw = font.widthOfTextAtSize(c, 9) + chipPadX * 2;
		page.drawRectangle({ x: chipX, y: chipsY, width: cw, height: chipH, color: chipBg, borderColor: panelBorder, borderWidth: 1 });
		text(c, chipX + chipPadX, chipsY + 4, 9, false, ink);
		chipX += cw + 6;
	}

	// Panel: Key details (2 cols)
	const panelTop = H - 112;
	const panelH = 210;
	page.drawRectangle({ x: M, y: panelTop - panelH, width: W - 2 * M, height: panelH, color: panel, borderColor: panelBorder, borderWidth: 1 });

	const colGap = 18;
	const colW = (W - 2 * M - colGap - 24) / 2; // padding inside
	let y = panelTop - 24;

	const drawField = (label: string, value: string | null, col: 0 | 1) => {
		const x = M + 12 + (col === 1 ? colW + colGap : 0);
		text(label, x, y, 9, false, subt);
		const lines = wrap(value || "—", colW, 10);
		let ly = y - 14;
		for (const ln of lines) {
			text(ln, x, ly, 10);
			ly -= LH;
		}
	};

	// Left column
	drawField("Customer Name", complaint.customerName, 0);
	y -= 40;
	drawField("Customer Email", complaint.customerEmail ?? "—", 0);
	y -= 40;
	drawField("Customer Phone", complaint.customerPhone, 0);
	y -= 40;
	drawField("Convenient Time", String(complaint.convenientTime).replace(/_/g, " "), 0);
	y -= 40;

	// Reset y for right column
	y = panelTop - 24;
	drawField("Address", complaint.customerAddress, 1);
	y -= 40;
	drawField("Building", complaint.buildingName, 1);
	y -= 40;
	drawField("Apartment", complaint.apartmentNumber ?? "—", 1);
	y -= 40;

	// Panel: Progress & responses
	const progTop = panelTop - panelH - 12;
	const progH = 96;
	page.drawRectangle({ x: M, y: progTop - progH, width: W - 2 * M, height: progH, color: panel, borderColor: panelBorder, borderWidth: 1 });

	text("Progress", M + 12, progTop - 18, 11, true);
	let py = progTop - 36;
	const progressPairs: [string, string][] = [
		["Status", isCompleted ? "Completed" : "In Progress"],
		["Total Time", `${totalHours.toFixed(1)} h`],
		["Completed On", completedOn ? fmtDubai(completedOn) : "—"],
		["Completed By", completedBy ?? "—"],
	];
	progressPairs.forEach(([k, v]) => {
		text(k, M + 12, py, 9, false, subt);
		text(v, M + 120, py, 10, true);
		py -= 18;
	});

	const rx = W / 2 + 6;
	text("Responses", rx, progTop - 18, 11, true);
	let ry = progTop - 36;
	const respPairs: [string, string][] = [
		["Count", String(responsesCount)],
		["First", firstResponseAt ? fmtDubai(firstResponseAt) : "—"],
		["Last", lastResponseAt ? fmtDubai(lastResponseAt) : "—"],
		["By", uniqueResponders || "—"],
	];
	respPairs.forEach(([k, v]) => {
		text(k, rx, ry, 9, false, subt);
		const maxW = W - M - rx - 12;
		const lines = wrap(v, maxW, 10);
		let ly = ry;
		for (const ln of lines) {
			text(ln, rx + 80, ly, 10, true);
			ly -= LH;
		}
		ry -= 18;
	});

	// Description panel (compact)
	const descTop = progTop - progH - 12;
	const descH = 120;
	page.drawRectangle({ x: M, y: descTop - descH, width: W - 2 * M, height: descH, color: panel, borderColor: panelBorder, borderWidth: 1 });
	text("Description", M + 12, descTop - 18, 11, true);
	if (complaint.description && complaint.description.trim()) {
		const lines = wrap(complaint.description.trim(), W - 2 * M - 24, 10);
		let dy = descTop - 36;
		for (const ln of lines) {
			text(ln, M + 12, dy, 10);
			dy -= LH;
			if (dy < M + 80) break; // avoid colliding with images section
		}
	} else {
		text("—", M + 12, descTop - 36, 10, false, subt);
	}

	// Images (compact thumbs to keep size small)
	const imgsTop = descTop - descH - 12;
	page.drawRectangle({ x: M, y: M + 70, width: W - 2 * M, height: imgsTop - (M + 70), color: panel, borderColor: panelBorder, borderWidth: 1 });
	text(`Images (${images.length})`, M + 12, imgsTop - 18, 11, true);

	if (images.length > 0) {
		const pad = 10;
		const thumbW = (W - 2 * M - 24 - pad * 2) / 3; // 3 per row
		const thumbH = 110; // keep small to reduce size
		let ix = M + 12,
			iy = imgsTop - 36 - thumbH;

		for (let i = 0; i < images.length; i++) {
			const raw = await fetchImageBytes(images[i]);
			if (!raw) continue;
			const down = await maybeDownscaleJpeg(raw, 900, 900); // keeps size in check
			const jpg = await doc.embedJpg(down);
			const dims = jpg.scale(Math.min(thumbW / jpg.width, thumbH / jpg.height));

			page.drawImage(jpg, { x: ix, y: Math.max(M + 76, iy), width: dims.width, height: dims.height });
			text(`Image ${i + 1}`, ix, Math.max(M + 64, iy - 10), 8, false, subt);

			// advance grid
			ix += thumbW + pad;
			if (ix + thumbW > W - M - 12) {
				ix = M + 12;
				iy -= thumbH + 34;
				if (iy < M + 90) break; // stop if out of page space
			}
		}
	} else {
		text("No images attached.", M + 12, imgsTop - 36, 10, false, subt);
	}

	// Footer
	text(`Complaint #${complaint.id}`, M, 40, 9, false, subt);
	text(`Page 1 of 1`, W - M - font.widthOfTextAtSize("Page 1 of 1", 9), 40, 9, false, subt);

	const bytes = await doc.save();
	const base64 = Buffer.from(bytes).toString("base64");
	return { fileName: `complaint_${complaint.id}.pdf`, base64 };
}

export async function generateComplaintsPdfByDateRange(startDate: string | Date, endDate: string | Date, limit = 1000): Promise<{ fileName: string; base64: string }> {
	// ---- Parse & normalize dates (make end inclusive through end-of-day)
	const s = startDate instanceof Date ? startDate : new Date(startDate);
	const e = endDate instanceof Date ? endDate : new Date(endDate);
	if (isNaN(+s) || isNaN(+e)) throw new Error("Invalid start or end date");

	const endInclusive = new Date(e);
	endInclusive.setHours(23, 59, 59, 999);

	// ---- Pull complaints in range (rich select matches your single-ID fn)
	const complaints = await prisma.complaint.findMany({
		where: { createdAt: { gte: s, lte: endInclusive } },
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			customerPhone: true,
			customerAddress: true,
			buildingName: true,
			apartmentNumber: true,
			description: true,
			imagePaths: true,
			convenientTime: true,
			createdAt: true,
			assignedTo: { select: { fullName: true, username: true } },
			workTimes: {
				select: {
					startTime: true,
					endTime: true,
					user: { select: { fullName: true } },
				},
				orderBy: { startTime: "asc" },
			},
			responses: {
				select: {
					id: true,
					createdAt: true,
					responder: { select: { fullName: true } },
				},
				orderBy: { createdAt: "asc" },
			},
		},
		orderBy: { createdAt: "asc" },
		take: limit,
	});

	if (!complaints || complaints.length === 0) {
		throw new Error("No complaints found for the given date range.");
	}

	// ---- PDF setup (identical metrics/palette to your single-ID version)
	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	// A4
	const W = 595.28;
	const H = 841.89;
	const M = 28;
	const LH = 13;

	// palette
	const ink = rgb(0.1, 0.12, 0.16);
	const subt = rgb(0.42, 0.45, 0.5);
	const chipBg = rgb(0.93, 0.95, 0.98);
	const panel = rgb(1, 1, 1);
	const panelBorder = rgb(0.9, 0.92, 0.94);
	const band = rgb(0.14, 0.44, 0.78);

	const totalPages = complaints.length;

	const wrap = (t: string, maxW: number, size = 10, f = font) => {
		const words = (t || "").split(/\s+/);
		const lines: string[] = [];
		let line = "";
		for (const w of words) {
			const trial = line ? `${line} ${w}` : w;
			if (f.widthOfTextAtSize(trial, size) > maxW) {
				if (line) lines.push(line);
				line = w;
			} else line = trial;
		}
		if (line) lines.push(line);
		return lines;
	};

	const drawComplaintPage = async (c: (typeof complaints)[number], pageIndex: number) => {
		const page = doc.addPage([W, H]);
		const text = (t: string, x: number, y: number, size = 10, bold = false, color = ink) => {
			page.drawText(t, { x, y, size, font: bold ? fontBold : font, color });
		};

		// Derive completion + metrics (same as your function)
		const finishedEntries = c.workTimes.filter((wt) => wt.endTime);
		const isCompleted = finishedEntries.length > 0;
		const latestEnd = isCompleted ? finishedEntries.reduce((max, wt) => (wt.endTime! > max ? wt.endTime! : max), finishedEntries[0].endTime!) : null;

		const completedOn = latestEnd ? new Date(latestEnd) : null;
		const completedBy = completedOn ? c.workTimes.filter((wt) => wt.endTime && wt.endTime.getTime() === completedOn.getTime()).map((wt) => wt.user.fullName)[0] ?? null : null;

		const now = new Date();
		const totalHours = c.workTimes.reduce((sum, wt) => {
			const end = wt.endTime ?? now;
			return sum + hoursBetween(wt.startTime, end);
		}, 0);

		const responsesCount = c.responses.length;
		const firstResponseAt = responsesCount ? c.responses[0].createdAt : null;
		const lastResponseAt = responsesCount ? c.responses[responsesCount - 1].createdAt : null;
		const uniqueResponders = Array.from(new Set(c.responses.map((r) => r.responder.fullName))).join(", ");

		const images = normalizeImagePaths(c.imagePaths);

		// Header band
		page.drawRectangle({ x: 0, y: H - 76, width: W, height: 76, color: band });
		text("Complaint Report", M, H - 38, 20, true, rgb(1, 1, 1));
		text(`#${c.id}`, M, H - 58, 12, false, rgb(1, 1, 1));
		const genAt = fmtDubai(new Date());
		const genStr = `Generated: ${genAt} (Asia/Dubai)`;
		text(genStr, W - M - font.widthOfTextAtSize(genStr, 10), H - 58, 10, false, rgb(1, 1, 1));

		// Chips
		let chipX = M;
		const chips = [`Created: ${fmtDubai(c.createdAt)}`, c.assignedTo ? `Assigned to: ${c.assignedTo.fullName}` : "Unassigned", isCompleted ? `Completed: ${fmtDubai(completedOn!)}` : "Not completed"];
		const chipH = 18,
			chipPadX = 6;
		const chipsY = H - 88;
		for (const chip of chips) {
			const cw = font.widthOfTextAtSize(chip, 9) + chipPadX * 2;
			page.drawRectangle({ x: chipX, y: chipsY, width: cw, height: chipH, color: chipBg, borderColor: panelBorder, borderWidth: 1 });
			text(chip, chipX + chipPadX, chipsY + 4, 9, false, ink);
			chipX += cw + 6;
		}

		// Panel: Key details (2 cols)
		const panelTop = H - 112;
		const panelH = 210;
		page.drawRectangle({ x: M, y: panelTop - panelH, width: W - 2 * M, height: panelH, color: panel, borderColor: panelBorder, borderWidth: 1 });

		const colGap = 18;
		const colW = (W - 2 * M - colGap - 24) / 2;
		let y = panelTop - 24;

		const drawField = (label: string, value: string | null, col: 0 | 1) => {
			const x = M + 12 + (col === 1 ? colW + colGap : 0);
			text(label, x, y, 9, false, subt);
			const lines = wrap(value || "—", colW, 10);
			let ly = y - 14;
			for (const ln of lines) {
				text(ln, x, ly, 10);
				ly -= LH;
			}
		};

		// Left column
		drawField("Customer Name", c.customerName, 0);
		y -= 40;
		drawField("Customer Email", c.customerEmail ?? "—", 0);
		y -= 40;
		drawField("Customer Phone", c.customerPhone, 0);
		y -= 40;
		drawField("Convenient Time", String(c.convenientTime).replace(/_/g, " "), 0);
		y -= 40;

		// Right column
		y = panelTop - 24;
		drawField("Address", c.customerAddress, 1);
		y -= 40;
		drawField("Building", c.buildingName, 1);
		y -= 40;
		drawField("Apartment", c.apartmentNumber ?? "—", 1);
		y -= 40;

		// Panel: Progress & responses
		const progTop = panelTop - panelH - 12;
		const progH = 96;
		page.drawRectangle({ x: M, y: progTop - progH, width: W - 2 * M, height: progH, color: panel, borderColor: panelBorder, borderWidth: 1 });

		text("Progress", M + 12, progTop - 18, 11, true);
		let py = progTop - 36;
		(
			[
				["Status", isCompleted ? "Completed" : "In Progress"],
				["Total Time", `${totalHours.toFixed(1)} h`],
				["Completed On", completedOn ? fmtDubai(completedOn) : "—"],
				["Completed By", completedBy ?? "—"],
			] as [string, string][]
		).forEach(([k, v]) => {
			text(k, M + 12, py, 9, false, subt);
			text(v, M + 120, py, 10, true);
			py -= 18;
		});

		const rx = W / 2 + 6;
		text("Responses", rx, progTop - 18, 11, true);
		let ry = progTop - 36;
		(
			[
				["Count", String(responsesCount)],
				["First", firstResponseAt ? fmtDubai(firstResponseAt) : "—"],
				["Last", lastResponseAt ? fmtDubai(lastResponseAt) : "—"],
				["By", uniqueResponders || "—"],
			] as [string, string][]
		).forEach(([k, v]) => {
			text(k, rx, ry, 9, false, subt);
			const maxW = W - M - rx - 12;
			const lines = wrap(v, maxW, 10);
			let ly = ry;
			for (const ln of lines) {
				text(ln, rx + 80, ly, 10, true);
				ly -= LH;
			}
			ry -= 18;
		});

		// Description
		const descTop = progTop - progH - 12;
		const descH = 120;
		page.drawRectangle({ x: M, y: descTop - descH, width: W - 2 * M, height: descH, color: panel, borderColor: panelBorder, borderWidth: 1 });
		text("Description", M + 12, descTop - 18, 11, true);
		if (c.description && c.description.trim()) {
			const lines = wrap(c.description.trim(), W - 2 * M - 24, 10);
			let dy = descTop - 36;
			for (const ln of lines) {
				text(ln, M + 12, dy, 10);
				dy -= LH;
				if (dy < M + 80) break;
			}
		} else {
			text("—", M + 12, descTop - 36, 10, false, subt);
		}

		// Images (compact thumbs)
		const imgsTop = descTop - descH - 12;
		page.drawRectangle({ x: M, y: M + 70, width: W - 2 * M, height: imgsTop - (M + 70), color: panel, borderColor: panelBorder, borderWidth: 1 });
		text(`Images (${images.length})`, M + 12, imgsTop - 18, 11, true);

		if (images.length > 0) {
			const pad = 10;
			const thumbW = (W - 2 * M - 24 - pad * 2) / 3;
			const thumbH = 110;
			let ix = M + 12,
				iy = imgsTop - 36 - thumbH;

			for (let i = 0; i < images.length; i++) {
				const raw = await fetchImageBytes(images[i]);
				if (!raw) continue;
				const down = await maybeDownscaleJpeg(raw, 900, 900);
				const jpg = await doc.embedJpg(down);
				const scale = Math.min(thumbW / jpg.width, thumbH / jpg.height);
				const w = jpg.width * scale;
				const h = jpg.height * scale;

				page.drawImage(jpg, { x: ix, y: Math.max(M + 76, iy), width: w, height: h });
				text(`Image ${i + 1}`, ix, Math.max(M + 64, iy - 10), 8, false, subt);

				ix += thumbW + pad;
				if (ix + thumbW > W - M - 12) {
					ix = M + 12;
					iy -= thumbH + 34;
					if (iy < M + 90) break;
				}
			}
		} else {
			text("No images attached.", M + 12, imgsTop - 36, 10, false, subt);
		}

		// Footer
		const footerLeft = `Complaint #${c.id}`;
		const footerRight = `Page ${pageIndex + 1} of ${totalPages}`;
		text(footerLeft, M, 40, 9, false, subt);
		text(footerRight, W - M - font.widthOfTextAtSize(footerRight, 9), 40, 9, false, subt);
	};

	// ---- Render pages
	for (let i = 0; i < complaints.length; i++) {
		// eslint-disable-next-line no-await-in-loop
		await drawComplaintPage(complaints[i], i);
	}

	// ---- Save + return
	const bytes = await doc.save();
	const base64 = Buffer.from(bytes).toString("base64");

	const fileName = `complaints_created_${s.toISOString().slice(0, 10)}_${e.toISOString().slice(0, 10)}.pdf`;

	return { fileName, base64 };
}
