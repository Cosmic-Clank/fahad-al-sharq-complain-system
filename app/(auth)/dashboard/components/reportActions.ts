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
			area: true,
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
	drawField("Area", complaint.area, 1);
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
