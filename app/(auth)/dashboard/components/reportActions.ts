// components/reportActions.ts
"use server";

import prisma from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type ComplaintColumn = "customerPhone" | "buildingName" | "apartmentNumber";
export type PreviewCriterion = ComplaintColumn | "createdAt";

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

type ExtraFilters = {
	buildingName?: string;
	/** If present, we AND: apartmentNumber IN (apartmentNumbers) */
	apartmentNumbers?: string[];
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const ALLOWED = new Set<ComplaintColumn>(["customerPhone", "buildingName", "apartmentNumber"]);

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

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
	try {
		const res = await fetch(url, { cache: "no-store" });
		if (!res.ok) return null;
		return new Uint8Array(await res.arrayBuffer());
	} catch {
		return null;
	}
}

async function maybeDownscaleJpeg(bytes: Uint8Array, maxW = 900, maxH = 900): Promise<Uint8Array> {
	try {
		const sharpMod = await import("sharp").catch(() => null as any);
		if (!sharpMod?.default) return bytes;
		const sharp = sharpMod.default;
		const out = await sharp(bytes).rotate().resize({ width: maxW, height: maxH, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
		return new Uint8Array(out);
	} catch {
		return bytes;
	}
}

function hoursBetween(a: Date, b: Date) {
	const ms = b.getTime() - a.getTime();
	return Math.max(0, ms / (1000 * 60 * 60));
}

function humanizeHoursMinutes(totalMs: number) {
	const totalMinutes = Math.max(0, Math.floor(totalMs / 60000));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours} ${hours === 1 ? "hour" : "hours"} and ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

const CONVENIENT_TIME_LABELS: Record<string, string> = {
	EIGHT_AM_TO_TEN_AM: "8 AM – 10 AM",
	TEN_AM_TO_TWELVE_PM: "10 AM – 12 PM",
	TWELVE_PM_TO_TWO_PM: "12 PM – 2 PM",
	TWO_PM_TO_FOUR_PM: "2 PM – 4 PM",
	FOUR_PM_TO_SIX_PM: "4 PM – 6 PM",
	SIX_PM_TO_EIGHT_PM: "6 PM – 8 PM",
	EIGHT_PM_TO_TEN_PM: "8 PM – 10 PM",
	TEN_PM_TO_TWELVE_AM: "10 PM – 12 AM",
	TWELVE_AM_TO_TWO_AM: "12 AM – 2 AM",
	TWO_AM_TO_FOUR_AM: "2 AM – 4 AM",
	FOUR_AM_TO_SIX_AM: "4 AM – 6 AM",
	SIX_AM_TO_EIGHT_AM: "6 AM – 8 AM",
};

function prettyConvenientTime(value: unknown): string {
	if (!value) return "—";
	const key = String(value);
	return CONVENIENT_TIME_LABELS[key] ?? "—";
}

type DateCriterion = "createdAt";
function isDateCriterion(c?: PreviewCriterion): c is DateCriterion {
	return c === "createdAt";
}

function buildWhere(
	input: {
		criterion?: PreviewCriterion;
		value?: string;
		startDate?: string;
		endDate?: string;
	} & ExtraFilters
) {
	const { criterion, value, startDate, endDate, buildingName, apartmentNumbers } = input;
	const where: any = {};

	if (isDateCriterion(criterion)) {
		if (!startDate || !endDate) throw new Error("startDate and endDate are required for createdAt");
		const { start, endExclusive } = toUtcDayRange(startDate, endDate);
		where.createdAt = { gte: start, lt: endExclusive };
	} else if (criterion) {
		if (!ALLOWED.has(criterion)) throw new Error("Invalid column");
		if (value != null && String(value).trim() !== "" && value !== "__ANY__") {
			(where as any)[criterion] = value;
		}
	}

	if (buildingName && String(buildingName).trim() !== "") {
		where.buildingName = buildingName;
	}

	if (Array.isArray(apartmentNumbers) && apartmentNumbers.length > 0) {
		const vals = Array.from(new Set(apartmentNumbers.map((v) => String(v).trim()).filter((v) => v.length > 0)));
		if (vals.length > 0) {
			where.apartmentNumber = { in: vals };
		}
	}

	return where;
}

// ─────────────────────────────────────────────────────────────
// Server Actions
// ─────────────────────────────────────────────────────────────

export async function getUniqueOptions(column: ComplaintColumn, filters?: Record<string, any>): Promise<UniqueOption[]> {
	if (!ALLOWED.has(column)) throw new Error("Invalid column");

	const where: any = {};
	if (filters) {
		for (const [k, v] of Object.entries(filters)) {
			if (k === "apartmentNumbers" && Array.isArray(v) && v.length > 0) {
				where.apartmentNumber = { in: v.map((x) => String(x)) };
			} else {
				where[k] = v;
			}
		}
	}

	const rows = await prisma.complaint.findMany({
		distinct: [column as any],
		where: Object.keys(where).length ? where : undefined,
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

export async function previewComplaints(params: { criterion: PreviewCriterion; value?: string; startDate?: string; endDate?: string; buildingName?: string; apartmentNumbers?: string[]; limit?: number }): Promise<ComplaintPreviewRow[]> {
	const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 500);
	const where = buildWhere(params);

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
			imagePaths: true,
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

async function fetchComplaints(params: { criterion?: PreviewCriterion; value?: string; startDate?: string; endDate?: string; buildingName?: string; apartmentNumbers?: string[]; limit?: number }): Promise<ComplaintPreviewRow[]> {
	const limit = Math.min(Math.max(Number(params.limit ?? 300), 1), 1000);
	const where = buildWhere(params);

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
			imagePaths: true,
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
// PDF generator (shared renderer used by both)
// ─────────────────────────────────────────────────────────────

type ComplaintsPdfResult = { fileName: string; base64: string };

// ===== MULTI-PAGE =====
export async function generateComplaintsPdfByFilter(column: string, value: unknown, extra?: ExtraFilters & { startDate?: string; endDate?: string }): Promise<ComplaintsPdfResult> {
	const where = buildWhere({
		criterion: column as any,
		value: typeof value === "string" ? value : String(value),
		startDate: extra?.startDate,
		endDate: extra?.endDate,
		buildingName: extra?.buildingName,
		apartmentNumbers: extra?.apartmentNumbers,
	});

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
					workerInitials: true,
					customerInitials: true,
					workerSignatureBase64: true,
					customerSignatureBase64: true,
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

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	const W = 595.28,
		H = 841.89,
		M = 28,
		LH = 13;
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

		// metrics
		const now = new Date();
		const firstStart = c.workTimes.length ? c.workTimes.reduce((min, wt) => (wt.startTime < min.startTime ? wt : min), c.workTimes[0]) : null;
		const startedOn = firstStart ? firstStart.startTime : null;
		const startedBy = firstStart ? firstStart.user.fullName : null;

		const finishedEntries = c.workTimes.filter((wt) => wt.endTime);
		const endedOn = finishedEntries.length ? new Date(Math.max(...finishedEntries.map((wt) => wt.endTime!.getTime()))) : null;

		const hasOpenIntervals = c.workTimes.some((wt) => !wt.endTime);
		const status = endedOn && !hasOpenIntervals ? "Completed" : c.workTimes.length > 0 ? "In Progress" : "Not started";

		const completedBy = endedOn ? c.workTimes.filter((wt) => wt.endTime && wt.endTime.getTime() === endedOn.getTime()).map((wt) => wt.user.fullName)[0] ?? null : null;

		// ADDED: derive worker/customer signatures from the completion entry
		const completionWT = endedOn ? c.workTimes.find((wt) => wt.endTime && wt.endTime.getTime() === endedOn.getTime()) : null;
		const hasWorkerSignatureImage = endedOn && completionWT?.workerSignatureBase64;
		const hasCustomerSignatureImage = endedOn && completionWT?.customerSignatureBase64;
		const workerSignatureFallback = endedOn ? completionWT?.workerInitials || "—" : "N/A";
		const customerSignatureFallback = endedOn ? completionWT?.customerInitials || "—" : "N/A";

		const totalMs = c.workTimes.reduce((sum, wt) => {
			const end = wt.endTime ?? now;
			return sum + Math.max(0, end.getTime() - wt.startTime.getTime());
		}, 0);
		const timeWorkedFor = humanizeHoursMinutes(totalMs);

		const responsesCount = c.responses.length;
		const firstResponseAt = responsesCount ? c.responses[0].createdAt : null;
		const lastResponseAt = responsesCount ? c.responses[responsesCount - 1].createdAt : null;
		const uniqueResponders = Array.from(new Set(c.responses.map((r) => r.responder.fullName))).join(", ");
		const images = normalizeImagePaths(c.imagePaths);

		// header with full-width image
		try {
			const headerPath = join(process.cwd(), "public/header.png");
			const headerBytes = new Uint8Array(readFileSync(headerPath));
			if (headerBytes && headerBytes.length > 0) {
				const headerImage = await doc.embedPng(headerBytes);
				const scale = W / headerImage.width;
				const headerHeight = headerImage.height * scale;
				page.drawImage(headerImage, {
					x: 0,
					y: H - headerHeight,
					width: W,
					height: headerHeight,
				});
			}
		} catch (e) {
			console.error("Failed to load header image:", e);
			page.drawRectangle({ x: 0, y: H - 76, width: W, height: 76, color: band });
		}

		// chips
		let chipX = M;
		const chips = [`Created: ${fmtDubai(c.createdAt)}`, c.assignedTo ? `Assigned to: ${c.assignedTo.fullName}` : "Unassigned", endedOn ? `Completed: ${fmtDubai(endedOn)}` : "Not completed"];
		const chipH = 18,
			chipPadX = 6,
			chipsY = H - 100;
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

		// details (smaller)
		const DETAILS_PANEL_H = 140;
		const FIELD_SPACING = 28;

		const panelTop = H - 130;
		const panelH = DETAILS_PANEL_H;
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

		const textField = (label: string, value: string | null, col: 0 | 1) => {
			const x = M + 12 + (col === 1 ? colW + colGap : 0);
			text(label, x, y, 9, false, subt);
			const lines = wrap(value || "—", colW, 10);
			let ly = y - 14;
			for (const ln of lines) {
				text(ln, x, ly, 10);
				ly -= LH;
			}
		};

		textField("Customer Name", c.customerName, 0);
		y -= FIELD_SPACING;
		textField("Customer Email", c.customerEmail ?? "—", 0);
		y -= FIELD_SPACING;
		textField("Customer Phone", c.customerPhone, 0);
		y -= FIELD_SPACING;
		textField("Convenient Time", prettyConvenientTime(c.convenientTime), 0);
		y -= FIELD_SPACING;

		y = panelTop - 24;
		textField("Address", c.customerAddress, 1);
		y -= FIELD_SPACING;
		textField("Building", c.buildingName, 1);
		y -= FIELD_SPACING;
		textField("Apartment", c.apartmentNumber ?? "—", 1);
		y -= FIELD_SPACING;

		// progress (TWO COLUMNS - DYNAMIC HEIGHT)
		const PROGRESS_ROWS: [string, string][] = [
			["Status", status],
			["Work started on", startedOn ? fmtDubai(startedOn) : "—"],
			["Work started by", startedBy ?? "—"],
			["Work ended on", endedOn ? fmtDubai(endedOn) : "—"],
			["Work completed by", endedOn ? completedBy ?? "—" : "—"],
			["Time worked for", timeWorkedFor],
		];

		if (!hasWorkerSignatureImage && !hasCustomerSignatureImage) {
			PROGRESS_ROWS.push(["Worker signature", workerSignatureFallback]);
			PROGRESS_ROWS.push(["Customer signature", customerSignatureFallback]);
		}

		const ROW_SPACING = 16;
		const TOP_PADDING = 24;
		const BOTTOM_PADDING = 12;
		const rowsPerCol = Math.ceil(PROGRESS_ROWS.length / 2);
		const requiredProgH = TOP_PADDING + rowsPerCol * ROW_SPACING + BOTTOM_PADDING;
		const progH = Math.max(100, requiredProgH);

		const progTop = panelTop - panelH - 12;
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

		// Draw progress in 2 columns
		const progColW = (W - 2 * M - 24 - 12) / 2;
		let py = progTop - TOP_PADDING - 6;
		for (let i = 0; i < rowsPerCol; i++) {
			const row1 = PROGRESS_ROWS[i];
			const row2 = PROGRESS_ROWS[i + rowsPerCol];

			if (row1) {
				text(row1[0], M + 12, py, 8, false, subt);
				const val1Lines = wrap(row1[1], progColW - 100, 9);
				text(val1Lines[0] || row1[1], M + 100, py, 9, true);
			}

			if (row2) {
				text(row2[0], M + 12 + progColW + 12, py, 8, false, subt);
				const val2Lines = wrap(row2[1], progColW - 100, 9);
				text(val2Lines[0] || row2[1], M + 100 + progColW + 12, py, 9, true);
			}

			py -= ROW_SPACING;
		}

		// Signatures section (if images exist)
		let descTop = progTop - progH - 12;
		if (hasWorkerSignatureImage || hasCustomerSignatureImage) {
			const sigH = 100;
			const signaturesTop = descTop;
			descTop = descTop - sigH - 12;

			page.drawRectangle({
				x: M,
				y: signaturesTop - sigH,
				width: W - 2 * M,
				height: sigH,
				color: panel,
				borderColor: panelBorder,
				borderWidth: 1,
			});
			text("Signatures", M + 12, signaturesTop - 18, 11, true);

			const sigBoxW = (W - 2 * M - 24 - 12) / 2;
			const sigBoxH = 60;

			// Worker signature
			if (hasWorkerSignatureImage && completionWT?.workerSignatureBase64) {
				try {
					let base64Data = completionWT.workerSignatureBase64;
					// Remove data URL prefix if present
					if (base64Data.startsWith("data:")) {
						base64Data = base64Data.split(",")[1];
					}
					const sigBytes = Buffer.from(base64Data, "base64");
					const workerSigImage = await doc.embedPng(sigBytes);
					const scale = Math.min(sigBoxW / workerSigImage.width, sigBoxH / workerSigImage.height);
					const w = workerSigImage.width * scale;
					const h = workerSigImage.height * scale;
					const imgY = Math.max(M + 76, signaturesTop - 35 - h);
					page.drawImage(workerSigImage, {
						x: M + 12,
						y: imgY,
						width: w,
						height: h,
					});
					text("Worker", M + 12, Math.max(M + 76, imgY - 14), 9, false, subt);
				} catch (e) {
					console.error("Error embedding worker signature:", e);
					text("Worker: " + workerSignatureFallback, M + 12, signaturesTop - 40, 10);
				}
			} else {
				text("Worker: " + workerSignatureFallback, M + 12, signaturesTop - 40, 10);
			}

			// Customer signature
			if (hasCustomerSignatureImage && completionWT?.customerSignatureBase64) {
				try {
					let base64Data = completionWT.customerSignatureBase64;
					// Remove data URL prefix if present
					if (base64Data.startsWith("data:")) {
						base64Data = base64Data.split(",")[1];
					}
					const sigBytes = Buffer.from(base64Data, "base64");
					const customerSigImage = await doc.embedPng(sigBytes);
					const scale = Math.min(sigBoxW / customerSigImage.width, sigBoxH / customerSigImage.height);
					const w = customerSigImage.width * scale;
					const h = customerSigImage.height * scale;
					const imgY = Math.max(M + 76, signaturesTop - 35 - h);
					page.drawImage(customerSigImage, {
						x: M + 12 + sigBoxW + 12,
						y: imgY,
						width: w,
						height: h,
					});
					text("Customer", M + 12 + sigBoxW + 12, Math.max(M + 76, imgY - 14), 9, false, subt);
				} catch (e) {
					console.error("Error embedding customer signature:", e);
					text("Customer: " + customerSignatureFallback, M + 12 + sigBoxW + 12, signaturesTop - 40, 10);
				}
			} else {
				text("Customer: " + customerSignatureFallback, M + 12 + sigBoxW + 12, signaturesTop - 40, 10);
			}
		}

		// description
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

		// images
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
			const pad = 10,
				thumbW = (W - 2 * M - 24 - pad * 2) / 3,
				thumbH = 110;
			let ix = M + 12,
				iy = imgsTop - 36 - thumbH;
			for (let i = 0; i < images.length; i++) {
				const raw = await fetchImageBytes(images[i]);
				if (!raw) continue;
				const down = await maybeDownscaleJpeg(raw, 900, 900);
				const jpg = await doc.embedJpg(down);
				const scale = Math.min(thumbW / jpg.width, thumbH / jpg.height);
				const w = jpg.width * scale,
					h = jpg.height * scale;
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

		// footer
		const footerLeft = `Complaint #${c.id}`;
		const footerRight = `Page ${pageIndex + 1} of ${totalPages}`;
		text(footerLeft, M, 40, 9, false, subt);
		text(footerRight, W - M - font.widthOfTextAtSize(footerRight, 9), 40, 9, false, subt);
	};

	for (let i = 0; i < complaints.length; i++) {
		await drawComplaintPage(complaints[i], i);
	}

	const bytes = await doc.save();
	const base64 = Buffer.from(bytes).toString("base64");
	const safeVal = typeof value === "string" ? value.replace(/[^\w.-]+/g, "_").slice(0, 40) : String(value);
	const fileName = `complaints_${column}_${safeVal}.pdf`;
	return { fileName, base64 };
}

// ===== SINGLE PAGE BY ID =====
export async function generateComplaintPdfById(complaintId: string): Promise<{ fileName: string; base64: string }> {
	const id = Number(complaintId);

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
					workerInitials: true,
					customerInitials: true,
					workerSignatureBase64: true,
					customerSignatureBase64: true,
				},
				orderBy: { startTime: "asc" },
			},
			responses: {
				select: { id: true, createdAt: true, responder: { select: { fullName: true } } },
				orderBy: { createdAt: "asc" },
			},
		},
	});

	if (!complaint) throw new Error("Complaint not found");

	const now = new Date();
	const firstStart = complaint.workTimes.length ? complaint.workTimes.reduce((min, wt) => (wt.startTime < min.startTime ? wt : min), complaint.workTimes[0]) : null;
	const startedOn = firstStart ? firstStart.startTime : null;
	const startedBy = firstStart ? firstStart.user.fullName : null;

	const finishedEntries = complaint.workTimes.filter((wt) => wt.endTime);
	const endedOn = finishedEntries.length ? new Date(Math.max(...finishedEntries.map((wt) => wt.endTime!.getTime()))) : null;

	const hasOpenIntervals = complaint.workTimes.some((wt) => !wt.endTime);
	const status = endedOn && !hasOpenIntervals ? "Completed" : complaint.workTimes.length > 0 ? "In Progress" : "Not started";

	const completedBy = endedOn ? complaint.workTimes.filter((wt) => wt.endTime && wt.endTime.getTime() === endedOn.getTime()).map((wt) => wt.user.fullName)[0] ?? null : null;

	// ADDED: derive worker/customer signatures from the completion entry
	const completionWT = endedOn ? complaint.workTimes.find((wt) => wt.endTime && wt.endTime.getTime() === endedOn.getTime()) : null;
	const hasWorkerSignatureImage = endedOn && completionWT?.workerSignatureBase64;
	const hasCustomerSignatureImage = endedOn && completionWT?.customerSignatureBase64;
	const workerSignatureFallback = endedOn ? completionWT?.workerInitials || "—" : "N/A";
	const customerSignatureFallback = endedOn ? completionWT?.customerInitials || "—" : "N/A";

	const totalMs = complaint.workTimes.reduce((sum, wt) => {
		const end = wt.endTime ?? now;
		return sum + Math.max(0, end.getTime() - wt.startTime.getTime());
	}, 0);
	const timeWorkedFor = humanizeHoursMinutes(totalMs);

	const responsesCount = complaint.responses.length;
	const firstResponseAt = responsesCount ? complaint.responses[0].createdAt : null;
	const lastResponseAt = responsesCount ? complaint.responses[responsesCount - 1].createdAt : null;
	const uniqueResponders = Array.from(new Set(complaint.responses.map((r) => r.responder.fullName))).join(", ");
	const images = normalizeImagePaths(complaint.imagePaths);

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	const W = 595.28,
		H = 841.89,
		M = 28,
		LH = 13;
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

	// header with full-width image
	try {
		const headerPath = join(process.cwd(), "public/header.png");
		const headerBytes = new Uint8Array(readFileSync(headerPath));
		if (headerBytes && headerBytes.length > 0) {
			const headerImage = await doc.embedPng(headerBytes);
			const scale = W / headerImage.width;
			const headerHeight = headerImage.height * scale;
			page.drawImage(headerImage, {
				x: 0,
				y: H - headerHeight,
				width: W,
				height: headerHeight,
			});
		}
	} catch (e) {
		console.error("Failed to load header image:", e);
		page.drawRectangle({ x: 0, y: H - 76, width: W, height: 76, color: band });
	}

	// chips
	let chipX = M;
	const chips = [`Created: ${fmtDubai(complaint.createdAt)}`, complaint.assignedTo ? `Assigned to: ${complaint.assignedTo.fullName}` : "Unassigned", endedOn ? `Completed: ${fmtDubai(endedOn)}` : "Not completed"];
	const chipH = 18,
		chipPadX = 6,
		chipsY = H - 100;
	for (const c of chips) {
		const cw = font.widthOfTextAtSize(c, 9) + chipPadX * 2;
		page.drawRectangle({
			x: chipX,
			y: chipsY,
			width: cw,
			height: chipH,
			color: chipBg,
			borderColor: panelBorder,
			borderWidth: 1,
		});
		text(c, chipX + chipPadX, chipsY + 4, 9, false, ink);
		chipX += cw + 6;
	}

	// details (smaller)
	const DETAILS_PANEL_H = 140;
	const FIELD_SPACING = 28;

	const panelTop = H - 130;
	const panelH = DETAILS_PANEL_H;
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

	drawField("Customer Name", complaint.customerName, 0);
	y -= FIELD_SPACING;
	drawField("Customer Email", complaint.customerEmail ?? "—", 0);
	y -= FIELD_SPACING;
	drawField("Customer Phone", complaint.customerPhone, 0);
	y -= FIELD_SPACING;
	drawField("Convenient Time", prettyConvenientTime(complaint.convenientTime), 0);
	y -= FIELD_SPACING;

	y = panelTop - 24;
	drawField("Address", complaint.customerAddress, 1);
	y -= FIELD_SPACING;
	drawField("Building", complaint.buildingName, 1);
	y -= FIELD_SPACING;
	drawField("Apartment", complaint.apartmentNumber ?? "—", 1);
	y -= FIELD_SPACING;

	// progress (TWO COLUMNS - DYNAMIC HEIGHT)
	const PROGRESS_ROWS: [string, string][] = [
		["Status", status],
		["Work started on", startedOn ? fmtDubai(startedOn) : "—"],
		["Work started by", startedBy ?? "—"],
		["Work ended on", endedOn ? fmtDubai(endedOn) : "—"],
		["Work completed by", endedOn ? completedBy ?? "—" : "—"],
		["Time worked for", timeWorkedFor],
	];

	if (!hasWorkerSignatureImage && !hasCustomerSignatureImage) {
		PROGRESS_ROWS.push(["Worker signature", workerSignatureFallback]);
		PROGRESS_ROWS.push(["Customer signature", customerSignatureFallback]);
	}

	// 2-column layout
	const ROW_SPACING = 16;
	const TOP_PADDING = 24;
	const BOTTOM_PADDING = 12;
	const rowsPerCol = Math.ceil(PROGRESS_ROWS.length / 2);
	const requiredProgH = TOP_PADDING + rowsPerCol * ROW_SPACING + BOTTOM_PADDING;
	const progH = Math.max(100, requiredProgH);

	const progTop = panelTop - panelH - 12;
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

	// Draw progress in 2 columns
	const progColW = (W - 2 * M - 24 - 12) / 2;
	let py = progTop - TOP_PADDING - 6;
	for (let i = 0; i < rowsPerCol; i++) {
		const row1 = PROGRESS_ROWS[i];
		const row2 = PROGRESS_ROWS[i + rowsPerCol];

		if (row1) {
			text(row1[0], M + 12, py, 8, false, subt);
			const val1Lines = wrap(row1[1], progColW - 100, 9);
			text(val1Lines[0] || row1[1], M + 100, py, 9, true);
		}

		if (row2) {
			text(row2[0], M + 12 + progColW + 12, py, 8, false, subt);
			const val2Lines = wrap(row2[1], progColW - 100, 9);
			text(val2Lines[0] || row2[1], M + 100 + progColW + 12, py, 9, true);
		}

		py -= ROW_SPACING;
	}

	// Signatures section (if images exist)
	let descTop = progTop - progH - 12;
	if (hasWorkerSignatureImage || hasCustomerSignatureImage) {
		const sigH = 100;
		const signaturesTop = descTop;
		descTop = descTop - sigH - 12;

		page.drawRectangle({
			x: M,
			y: signaturesTop - sigH,
			width: W - 2 * M,
			height: sigH,
			color: panel,
			borderColor: panelBorder,
			borderWidth: 1,
		});
		text("Signatures", M + 12, signaturesTop - 18, 11, true);

		const sigBoxW = (W - 2 * M - 24 - 12) / 2;
		const sigBoxH = 60;

		// Worker signature
		if (hasWorkerSignatureImage && completionWT?.workerSignatureBase64) {
			try {
				let base64Data = completionWT.workerSignatureBase64;
				// Remove data URL prefix if present
				if (base64Data.startsWith("data:")) {
					base64Data = base64Data.split(",")[1];
				}
				const sigBytes = Buffer.from(base64Data, "base64");
				const workerSigImage = await doc.embedPng(sigBytes);
				const scale = Math.min(sigBoxW / workerSigImage.width, sigBoxH / workerSigImage.height);
				const w = workerSigImage.width * scale;
				const h = workerSigImage.height * scale;
				const imgY = Math.max(M + 76, signaturesTop - 35 - h);
				page.drawImage(workerSigImage, {
					x: M + 12,
					y: imgY,
					width: w,
					height: h,
				});
				text("Worker", M + 12, Math.max(M + 76, imgY - 14), 9, false, subt);
			} catch (e) {
				console.error("Error embedding worker signature:", e);
				text("Worker: " + workerSignatureFallback, M + 12, signaturesTop - 40, 10);
			}
		} else {
			text("Worker: " + workerSignatureFallback, M + 12, signaturesTop - 40, 10);
		}

		// Customer signature
		if (hasCustomerSignatureImage && completionWT?.customerSignatureBase64) {
			try {
				let base64Data = completionWT.customerSignatureBase64;
				// Remove data URL prefix if present
				if (base64Data.startsWith("data:")) {
					base64Data = base64Data.split(",")[1];
				}
				const sigBytes = Buffer.from(base64Data, "base64");
				const customerSigImage = await doc.embedPng(sigBytes);
				const scale = Math.min(sigBoxW / customerSigImage.width, sigBoxH / customerSigImage.height);
				const w = customerSigImage.width * scale;
				const h = customerSigImage.height * scale;
				const imgY = Math.max(M + 76, signaturesTop - 35 - h);
				page.drawImage(customerSigImage, {
					x: M + 12 + sigBoxW + 12,
					y: imgY,
					width: w,
					height: h,
				});
				text("Customer", M + 12 + sigBoxW + 12, Math.max(M + 76, imgY - 14), 9, false, subt);
			} catch (e) {
				console.error("Error embedding customer signature:", e);
				text("Customer: " + customerSignatureFallback, M + 12 + sigBoxW + 12, signaturesTop - 40, 10);
			}
		} else {
			text("Customer: " + customerSignatureFallback, M + 12 + sigBoxW + 12, signaturesTop - 40, 10);
		}
	}

	// description
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
	if (complaint.description && complaint.description.trim()) {
		const lines = wrap(complaint.description.trim(), W - 2 * M - 24, 10);
		let dy = descTop - 36;
		for (const ln of lines) {
			text(ln, M + 12, dy, 10);
			dy -= LH;
			if (dy < M + 80) break;
		}
	} else {
		text("—", M + 12, descTop - 36, 10, false, subt);
	}

	// images
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
		const pad = 10,
			thumbW = (W - 2 * M - 24 - pad * 2) / 3,
			thumbH = 110;
		let ix = M + 12,
			iy = imgsTop - 36 - thumbH;
		for (let i = 0; i < images.length; i++) {
			const raw = await fetchImageBytes(images[i]);
			if (!raw) continue;
			const down = await maybeDownscaleJpeg(raw, 900, 900);
			const jpg = await doc.embedJpg(down);
			const scale = Math.min(thumbW / jpg.width, thumbH / jpg.height);
			const w = jpg.width * scale,
				h = jpg.height * scale;
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

	// footer
	text(`Complaint #${complaint.id}`, M, 40, 9, false, subt);
	text(`Page 1 of 1`, W - M - font.widthOfTextAtSize("Page 1 of 1", 9), 40, 9, false, subt);

	const bytes = await doc.save();
	const base64 = Buffer.from(bytes).toString("base64");
	return { fileName: `complaint_${complaint.id}.pdf`, base64 };
}

// Date-range PDF (reuses the filter generator)
export async function generateComplaintsPdfByDateRange(startDate: string | Date, endDate: string | Date, limit = 1000, extra?: ExtraFilters): Promise<{ fileName: string; base64: string }> {
	const s = startDate instanceof Date ? startDate : new Date(startDate);
	const e = endDate instanceof Date ? endDate : new Date(endDate);
	if (isNaN(+s) || isNaN(+e)) throw new Error("Invalid start or end date");

	return generateComplaintsPdfByFilter("createdAt", `${s.toISOString().slice(0, 10)}_${e.toISOString().slice(0, 10)}`, {
		startDate: s.toISOString().slice(0, 10),
		endDate: e.toISOString().slice(0, 10),
		buildingName: extra?.buildingName,
		apartmentNumbers: extra?.apartmentNumbers,
	});
}
