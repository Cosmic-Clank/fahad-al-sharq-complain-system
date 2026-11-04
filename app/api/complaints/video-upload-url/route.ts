import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import prismaClient from "@/lib/prisma";
import supabaseAdminClient from "@/lib/supabaseAdmin";
import { EVIDENCE_MESSAGES, MAX_VIDEO_BYTES, VIDEO_BUCKET, VIDEO_TYPES } from "@/lib/complaint-evidence";

const requestSchema = z.object({
	contentType: z.string(),
	size: z.number().int().positive(),
	buildingName: z.string().min(1),
	apartmentNumber: z.string().min(1),
});

/**
 * Issues a one-time signed URL so the complaint form can upload its video
 * straight to Supabase Storage (videos are far too large for a request body).
 */
export async function POST(req: NextRequest) {
	const parsed = requestSchema.safeParse(await req.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json({ message: "Invalid input" }, { status: 400 });
	}
	const { contentType, size, buildingName, apartmentNumber } = parsed.data;

	const ext = VIDEO_TYPES[contentType];
	if (!ext || size > MAX_VIDEO_BYTES) {
		return NextResponse.json({ message: EVIDENCE_MESSAGES.invalidVideo }, { status: 400 });
	}

	// A building deactivated after the form was opened
	if (await prismaClient.buildings.findFirst({ where: { buildingName, isActive: false }, select: { id: true } })) {
		return NextResponse.json({ message: "This building is no longer available. Please reload the page and choose again." }, { status: 400 });
	}

	// Same 24h duplicate rule as /api/complaints — checked up front so nobody uploads a large video for nothing
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const existing = await prismaClient.complaint.findFirst({
		where: { buildingName, apartmentNumber, createdAt: { gte: since } },
		select: { id: true },
	});
	if (existing) {
		return NextResponse.json(
			{ message: "A complaint for this building and apartment was already submitted in the last 24 hours. Please wait before submitting another one." },
			{ status: 429 }
		);
	}

	const path = `${nanoid()}.${ext}`;
	const { data, error } = await supabaseAdminClient.storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);
	if (error || !data) {
		console.error("Error creating signed video upload URL:", error);
		return NextResponse.json({ message: EVIDENCE_MESSAGES.videoUploadFailed }, { status: 500 });
	}

	return NextResponse.json({ path: data.path, signedUrl: data.signedUrl });
}
