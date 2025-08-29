// components/reportActions.ts
"use server";

import prisma from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Buffer } from "node:buffer";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ComplaintColumn = "customerName" | "customerEmail" | "customerPhone" | "customerAddress" | "buildingName" | "apartmentNumber" | "area";

export type PreviewCriterion = ComplaintColumn | "createdAt";

const ALLOWED = new Set<ComplaintColumn>(["customerName", "customerEmail", "customerPhone", "customerAddress", "buildingName", "apartmentNumber", "area"]);

export type UniqueOption = { value: string; label: string };

export type ComplaintPreviewRow = {
	id: string;
	customerName: string;
	customerEmail: string | null;
	customerPhone: string;
	customerAddress: string;
	buildingName: string;
	apartmentNumber: string | null;
	area: string;
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
	area: "Area",
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
			area: true,
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
		area: r.area,
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
			area: true,
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
		area: r.area,
		description: r.description ?? null,
		createdAt: r.createdAt.toISOString(),
		images: normalizeImagePaths((r as any).imagePaths),
	}));
}

// ─────────────────────────────────────────────────────────────
// PDF generator (pdf-lib) — with JPG images at bottom
// ─────────────────────────────────────────────────────────────

export async function generateComplaintsPdf(params: { criterion: PreviewCriterion; value?: string; startDate?: string; endDate?: string; limit?: number }): Promise<{ fileName: string; base64: string }> {
	const rows = await fetchComplaints(params);

	const filterSummary = params.criterion === "createdAt" ? `${CRITERION_LABEL.createdAt}: ${params.startDate} → ${params.endDate}` : `${CRITERION_LABEL[params.criterion]}: ${params.value}`;

	const generatedAt = fmtDubai(new Date());
	const fileName = params.criterion === "createdAt" ? `complaints_${params.startDate}_${params.endDate}.pdf` : `complaints_${params.criterion}-${(params.value || "").replace(/\W+/g, "_")}.pdf`;

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	// A4 points
	const W = 595.28;
	const H = 841.89;
	const M = 32; // margin
	const lineHeight = 14;

	// palette (tailwind-ish)
	const slate900 = rgb(0.06, 0.09, 0.16);
	const gray800 = rgb(0.12, 0.16, 0.22);
	const gray200 = rgb(0.9, 0.91, 0.93);
	const gray100 = rgb(0.95, 0.96, 0.98);
	const grayBorder = rgb(0.9, 0.91, 0.93);

	// utils
	const drawText = (page: any, text: string, x: number, y: number, size = 11, bold = false, color = slate900) => {
		page.drawText(text, { x, y, size, font: bold ? fontBold : font, color });
	};

	const wrapText = (text: string, maxWidth: number, size = 11, f = font) => {
		const words = (text || "").split(/\s+/);
		const lines: string[] = [];
		let line = "";
		for (const w of words) {
			const test = line ? `${line} ${w}` : w;
			if (f.widthOfTextAtSize(test, size) > maxWidth) {
				if (line) lines.push(line);
				line = w;
			} else line = test;
		}
		if (line) lines.push(line);
		return lines;
	};

	const header = (page: any, yStart: number) => {
		// header background
		page.drawRectangle({
			x: M,
			y: yStart - 58,
			width: W - 2 * M,
			height: 58,
			color: gray800,
			borderRadius: 8,
		});
		drawText(page, "Complaints Report", M + 14, yStart - 22, 16, true, gray200);
		drawText(page, `Generated: ${generatedAt} (Asia/Dubai)`, M + 14, yStart - 40, 10, false, gray200);

		// chips
		const chipY = yStart - 54;
		const chipPadX = 6,
			chipPadY = 3;
		const chipSize = 9;
		const chips = [filterSummary, `Total: ${rows.length}`];

		let cx = M + 14;
		for (const c of chips) {
			const tw = font.widthOfTextAtSize(c, chipSize);
			const cw = tw + chipPadX * 2;
			page.drawRectangle({
				x: cx,
				y: chipY - chipPadY,
				width: cw,
				height: chipSize + chipPadY * 2,
				color: gray200,
				borderRadius: 8,
			});
			drawText(page, c, cx + chipPadX, chipY, chipSize, false, slate900);
			cx += cw + 6;
		}
	};

	const drawField = (page: any, label: string, value: string, x: number, y: number, width: number) => {
		page.drawRectangle({
			x,
			y: y - 44,
			width,
			height: 44,
			color: gray100,
			borderColor: grayBorder,
			borderWidth: 1,
			borderRadius: 8,
		});
		drawText(page, label, x + 8, y - 14, 9, false, rgb(0.42, 0.45, 0.5));
		const lines = wrapText(value || "—", width - 16, 11, font);
		let ly = y - 30;
		for (const line of lines) {
			drawText(page, line, x + 8, ly, 11, false, slate900);
			ly -= lineHeight;
			if (ly < 80) break; // avoid overflow in field
		}
	};

	const drawDescription = (page: any, title: string, text: string, x: number, y: number, width: number) => {
		drawText(page, title, x, y, 11, true, slate900);
		const lines = wrapText(text, width, 11, font);
		let ly = y - 16;
		// box
		const boxHeight = Math.min(140, lines.length * lineHeight + 16);
		page.drawRectangle({
			x,
			y: ly - boxHeight + 16,
			width,
			height: boxHeight,
			color: rgb(0.98, 0.98, 0.98),
			borderColor: grayBorder,
			borderWidth: 1,
			borderRadius: 8,
		});
		ly = ly + (boxHeight - 16) - lineHeight; // start from top inside box
		for (const line of lines) {
			drawText(page, line, x + 8, ly, 11, false, slate900);
			ly -= lineHeight;
			if (ly < 90) break;
		}
	};

	async function drawJpgFitted(opts: { page: any; jpgBytes: Uint8Array; x: number; y: number; maxW: number; maxH: number }) {
		const jpg = await doc.embedJpg(opts.jpgBytes);
		const { width, height } = jpg.size();
		const scale = Math.min(opts.maxW / width, opts.maxH / height, 1);
		const w = width * scale;
		const h = height * scale;
		opts.page.drawImage(jpg, { x: opts.x, y: opts.y, width: w, height: h });
		return { w, h };
	}

	if (rows.length === 0) {
		const page = doc.addPage([W, H]);
		header(page, H - M);
		// empty card
		page.drawRectangle({
			x: M,
			y: H - M - 58 - 16 - 120,
			width: W - 2 * M,
			height: 120,
			color: rgb(1, 1, 1),
			borderColor: grayBorder,
			borderWidth: 1,
		});
		page.drawText("No results", {
			x: M + 18,
			y: H - M - 58 - 16 - 40,
			size: 14,
			font: fontBold,
			color: slate900,
		});
		drawText(page, "No complaints matched your filter.", M + 18, H - M - 58 - 16 - 64, 11, false, rgb(0.42, 0.45, 0.5));
	} else {
		for (let idx = 0; idx < rows.length; idx++) {
			const r = rows[idx];
			const page = doc.addPage([W, H]);

			// header
			header(page, H - M);

			// card border
			const top = H - M - 58 - 16;
			page.drawRectangle({
				x: M,
				y: M,
				width: W - 2 * M,
				height: top - M,
				color: rgb(1, 1, 1),
				borderColor: grayBorder,
				borderWidth: 1,
			});

			// card header
			const titleY = top - 20;
			drawText(page, `Complaint #${r.id}`, M + 14, titleY, 14, true, slate900);
			drawText(page, `Created: ${fmtDubai(new Date(r.createdAt))}`, W - M - 200, titleY, 10, false, rgb(0.42, 0.45, 0.5));

			// 2-column grid of fields
			const colW = (W - 2 * M - 24) / 2; // gap 24
			let y = titleY - 20;

			drawField(page, "Customer Name", r.customerName, M + 12, y, colW);
			drawField(page, "Customer Email", r.customerEmail ?? "—", M + 12 + colW + 24, y, colW);
			y -= 52;

			drawField(page, "Customer Phone", r.customerPhone, M + 12, y, colW);
			drawField(page, "Customer Address", r.customerAddress, M + 12 + colW + 24, y, colW);
			y -= 52;

			drawField(page, "Building", r.buildingName, M + 12, y, colW);
			drawField(page, "Apartment", r.apartmentNumber ?? "—", M + 12 + colW + 24, y, colW);
			y -= 52;

			drawField(page, "Area", r.area, M + 12, y, W - 2 * M - 24);
			y -= 60;

			if (r.description && r.description.trim()) {
				drawDescription(page, "Description", r.description, M + 12, y, W - 2 * M - 24);
			}

			// IMAGES — first image at bottom of the complaint page
			const imgs = (r.images ?? []).filter(Boolean);
			if (imgs.length > 0) {
				const bottomPad = 20;
				const bottomBoxH = 200; // reserved space at bottom on main page
				const bottomX = M + 12;
				const bottomY = M + bottomPad;
				const bottomW = W - 2 * M - 24;

				const firstUrl = imgs[0];
				const firstBytes = await fetchJpgBytes(firstUrl);
				if (firstBytes) {
					await drawJpgFitted({
						page,
						jpgBytes: firstBytes,
						x: bottomX,
						y: bottomY,
						maxW: bottomW,
						maxH: bottomBoxH,
					});
					drawText(page, "Image 1", bottomX, bottomY + bottomBoxH + 6, 9, false, rgb(0.42, 0.45, 0.5));
				}
			}

			// footer page number
			drawText(page, `Page ${idx + 1} of ${rows.length}`, W / 2 - 40, M - 10, 9, false, rgb(0.42, 0.45, 0.5));

			// CONTINUATION PAGES — remaining images (one per page)
			if ((r.images?.length ?? 0) > 1) {
				for (let i = 1; i < (r.images as string[]).length; i++) {
					const imgUrl = (r.images as string[])[i];
					const bytes = await fetchJpgBytes(imgUrl);
					const p = doc.addPage([W, H]);

					header(p, H - M);

					// Image box: use almost the whole inner area
					const boxX = M + 12;
					const boxY = M + 24;
					const boxW = W - 2 * M - 24;
					const boxH = H - M - 58 - 16 - M - 40;

					if (bytes) {
						const jpg = await doc.embedJpg(bytes);
						const { width, height } = jpg.size();
						const scale = Math.min(boxW / width, boxH / height, 1);
						const w = width * scale;
						const h = height * scale;

						p.drawImage(jpg, { x: boxX, y: boxY, width: w, height: h });
					}

					drawText(p, `Image ${i + 1}`, boxX, boxY + boxH + 8, 10, true, slate900);
					drawText(p, `Page (images)`, W / 2 - 30, M - 10, 9, false, rgb(0.42, 0.45, 0.5));
				}
			}
		}
	}

	const bytes = await doc.save();
	const base64 = Buffer.from(bytes).toString("base64");
	return { fileName, base64 };
}

// helper: build Supabase public URL

// server action: generate a PDF for a single complaint
export async function generateComplaintPdfById(complaintId: string): Promise<{ fileName: string; base64: string }> {
	const complaint = await prisma.complaint.findUnique({
		where: { id: Number(complaintId) },
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			customerPhone: true,
			customerAddress: true,
			buildingName: true,
			apartmentNumber: true,
			area: true,
			description: true,
			createdAt: true,
			imagePaths: true,
		},
	});

	if (!complaint) throw new Error("Complaint not found");

	const images = normalizeImagePaths((complaint as any).imagePaths);

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	const W = 595.28; // A4 width
	const H = 841.89; // A4 height
	const M = 32;
	const lineHeight = 14;

	const slate900 = rgb(0.06, 0.09, 0.16);
	const gray100 = rgb(0.95, 0.96, 0.98);
	const grayBorder = rgb(0.9, 0.91, 0.93);

	const page = doc.addPage([W, H]);

	const drawText = (text: string, x: number, y: number, size = 11, bold = false, color = slate900) => {
		page.drawText(text, { x, y, size, font: bold ? fontBold : font, color });
	};

	const wrapText = (text: string, maxWidth: number, size = 11) => {
		const words = (text || "").split(/\s+/);
		const lines: string[] = [];
		let line = "";
		for (const w of words) {
			const test = line ? `${line} ${w}` : w;
			if (font.widthOfTextAtSize(test, size) > maxWidth) {
				if (line) lines.push(line);
				line = w;
			} else line = test;
		}
		if (line) lines.push(line);
		return lines;
	};

	// Header
	drawText("Complaint Report", M, H - M - 20, 18, true);
	drawText(`Complaint #${complaint.id}`, M, H - M - 50, 12);
	drawText(`Created: ${complaint.createdAt.toISOString()}`, M, H - M - 70, 10);

	let y = H - M - 100;

	// Fields
	const fields: [string, string | null][] = [
		["Customer Name", complaint.customerName],
		["Customer Email", complaint.customerEmail],
		["Customer Phone", complaint.customerPhone],
		["Customer Address", complaint.customerAddress],
		["Building", complaint.buildingName],
		["Apartment", complaint.apartmentNumber],
		["Area", complaint.area],
	];

	for (const [label, val] of fields) {
		page.drawRectangle({
			x: M,
			y: y - 44,
			width: W - 2 * M,
			height: 44,
			color: gray100,
			borderColor: grayBorder,
			borderWidth: 1,
		});
		drawText(label, M + 8, y - 14, 9, false, rgb(0.42, 0.45, 0.5));
		const lines = wrapText(val || "—", W - 2 * M - 16, 11);
		let ly = y - 30;
		for (const line of lines) {
			drawText(line, M + 8, ly, 11, false, slate900);
			ly -= lineHeight;
		}
		y -= 60;
	}

	if (complaint.description) {
		drawText("Description:", M, y, 11, true);
		y -= 20;
		const lines = wrapText(complaint.description, W - 2 * M - 16, 11);
		for (const line of lines) {
			drawText(line, M, y, 11);
			y -= lineHeight;
		}
		y -= 20;
	}

	// Images
	if (images.length > 0) {
		for (let i = 0; i < images.length; i++) {
			const bytes = await fetchJpgBytes(images[i]);
			if (!bytes) continue;
			const jpg = await doc.embedJpg(bytes);
			const { width, height } = jpg.size();
			const scale = Math.min((W - 2 * M) / width, 200 / height, 1);
			const w = width * scale;
			const h = height * scale;
			page.drawImage(jpg, { x: M, y: y - h, width: w, height: h });
			drawText(`Image ${i + 1}`, M, y - h - 12, 9, false, rgb(0.42, 0.45, 0.5));
			y -= h + 40;
		}
	}

	const bytes = await doc.save();
	const base64 = Buffer.from(bytes).toString("base64");
	return { fileName: `complaint_${complaint.id}.pdf`, base64 };
}
