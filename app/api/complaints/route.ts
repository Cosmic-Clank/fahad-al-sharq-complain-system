// /app/api/complaints/route.ts (or /pages/api/complaints.ts)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prismaClient from "@/lib/prisma"; // Your Prisma client singleton
import path from "path"; // Import Node.js path module
import { nanoid } from "nanoid"; // For unique file names
import supabaseAdminClient from "@/lib/supabaseAdmin";
import { EVIDENCE_MESSAGES, IMAGE_BUCKET, IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES, MIN_IMAGES, VIDEO_BUCKET, VIDEO_PATH_PATTERN } from "@/lib/complaint-evidence";

// IMPORTANT: Re-define your Zod schema on the server for validation!
// Match this with your client-side formSchema, but enforce server-side validation.

const serverFormSchema = z.object({
	fullname: z.string({ required_error: "Full name is required" }).min(2, { message: "Full name must be at least 2 characters long" }).max(50, { message: "Full name must be at most 50 characters long" }),
	email: z.string({ required_error: "Email is required" }).email({ message: "Enter a valid email address" }).or(z.literal("")),
	phoneNumber: z
		.string({ required_error: "Phone number is required" })
		.trim()
		.regex(/^(?:\+971|00971|0)?5\d{8}$/, {
			message: "Enter a valid UAE mobile (e.g., 0501234567 or +971501234567)",
		}),
	address: z.string({ required_error: "Address is required" }).min(5, { message: "Address must be at least 5 characters long" }).max(100, { message: "Address must be at most 100 characters long" }),
	buildingName: z.string({ required_error: "Building name is required" }).trim().min(1, { message: "Building name is required" }),
	// trimmed so "101" and "101 " count as the same apartment in the 24h duplicate check
	apartmentNumber: z.string({ required_error: "Apartment Number is required" }).trim().min(1, { message: "Minimum 1 character" }),
	convenientTime: z.enum(["EIGHT_AM_TO_TEN_AM", "TEN_AM_TO_TWELVE_PM", "TWELVE_PM_TO_TWO_PM", "TWO_PM_TO_FOUR_PM", "FOUR_PM_TO_SIX_PM", "SIX_PM_TO_EIGHT_PM", "EIGHT_PM_TO_TEN_PM", "TEN_PM_TO_TWELVE_AM", "TWELVE_AM_TO_TWO_AM", "TWO_AM_TO_FOUR_AM", "FOUR_AM_TO_SIX_AM", "SIX_AM_TO_EIGHT_AM"], {
		required_error: "Convenient time is required",
	}),
	description: z.string({ required_error: "Description is required" }).min(10, { message: "Description must be at least 10 characters long" }).max(500, { message: "Description must be at most 500 characters long" }),
});

export async function POST(req: NextRequest) {
	// 1. Extract data from the request body
	const formData = await req.formData(); // We use formData to extract file inputs
	const rawData = {
		fullname: formData.get("fullname"),
		email: formData.get("email"),
		phoneNumber: formData.get("phoneNumber"),
		address: formData.get("address"),
		convenientTime: formData.get("convenientTime"), // Ensure this matches your schema
		buildingName: formData.get("buildingName"),
		apartmentNumber: formData.get("apartmentNumber"), // Ensure this matches your schema
		branchArea: formData.get("branchArea"),
		description: formData.get("description"),
	};

	const isPrivateRaw = formData.get("isPrivate");
	const isPrivate = isPrivateRaw === "true" ? true : null;

	// The video was uploaded directly to storage by the browser; only its path arrives here
	const videoPathRaw = formData.get("videoPath");
	const videoPath = typeof videoPathRaw === "string" && VIDEO_PATH_PATTERN.test(videoPathRaw) ? videoPathRaw : null;
	// A video already attached to a complaint is never deleted or re-used: anyone who has seen its
	// public URL could otherwise post a bad form with that path and have the evidence removed.
	const videoInUse = videoPath ? Boolean(await prismaClient.complaint.findFirst({ where: { videoPaths: { has: videoPath } }, select: { id: true } })) : false;
	// Best-effort removal of the already-uploaded video when the submission is rejected
	const discardVideo = async () => {
		if (videoPath && !videoInUse) await supabaseAdminClient.storage.from(VIDEO_BUCKET).remove([videoPath]).catch(() => undefined);
	};

	// 2. Server-side validation using Zod
	const validatedFields = serverFormSchema.safeParse(rawData);

	if (!validatedFields.success) {
		await discardVideo();
		console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
		return NextResponse.json(
			{
				errors: validatedFields.error.flatten().fieldErrors,
				message: "Failed to submit complaint due to validation errors.",
			},
			{ status: 400 }
		);
	}

	const { fullname, email, phoneNumber, address, buildingName, apartmentNumber, convenientTime, description } = validatedFields.data;

	// 3. Check for duplicate complaint from same building + apartment within 24 hours
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const existing = await prismaClient.complaint.findFirst({
		where: {
			buildingName,
			apartmentNumber,
			createdAt: { gte: since },
		},
		select: { id: true },
	});

	if (existing) {
		await discardVideo();
		return NextResponse.json(
			{ message: "A complaint for this building and apartment was already submitted in the last 24 hours. Please wait before submitting another one." },
			{ status: 429 }
		);
	}

	// --- Start Image Upload to Supabase ---
	// Skip empty file inputs (a blank <input type=file> posts a 0-byte entry)
	const files = (formData.getAll("images") as File[]).filter((file) => file.size > 0);

	const uploadedImagePaths: string[] = []; // This will now store only strings (paths)

	const maxSize = MAX_IMAGE_BYTES;
	const allowedTypes = IMAGE_TYPES;
	const maxImages = MAX_IMAGES;

	if (files.length > maxImages) {
		await discardVideo();
		return NextResponse.json({ message: `You can upload a maximum of ${maxImages} images.` }, { status: 400 });
	}

	// Evidence is mandatory: at least one photo and one (already uploaded) video
	if (files.length < MIN_IMAGES) {
		await discardVideo();
		return NextResponse.json({ message: EVIDENCE_MESSAGES.photoRequired }, { status: 400 });
	}
	if (!videoPath) {
		return NextResponse.json({ message: EVIDENCE_MESSAGES.videoRequired }, { status: 400 });
	}
	if (videoInUse) {
		return NextResponse.json({ message: EVIDENCE_MESSAGES.videoMissing }, { status: 400 });
	}
	const { data: videoExists } = await supabaseAdminClient.storage.from(VIDEO_BUCKET).exists(videoPath);
	if (!videoExists) {
		return NextResponse.json({ message: EVIDENCE_MESSAGES.videoMissing }, { status: 400 });
	}

	// Check every photo before uploading any, so a bad 3rd photo doesn't leave the first two behind
	const invalidFile = files.find((file) => !allowedTypes.includes(file.type) || file.size > maxSize);
	if (invalidFile) {
		console.warn(`Rejected invalid file: ${invalidFile.name}, type: ${invalidFile.type}, size: ${invalidFile.size}`);
		await discardVideo();
		return NextResponse.json(
			{
				message: `Invalid file detected: ${invalidFile.name}. Max size is 5MB, supported types are ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}.`,
			},
			{ status: 400 }
		);
	}

	// Random folder per complaint (photo URLs are public — don't put the customer's email in them)
	const directoryName = nanoid();
	const discardImages = async () => {
		if (uploadedImagePaths.length) await supabaseAdminClient.storage.from(IMAGE_BUCKET).remove(uploadedImagePaths).catch(() => undefined);
	};
	for (const file of files) {
		const uploadPath = path.posix.join(directoryName, nanoid());
		const { data, error } = await supabaseAdminClient.storage.from(IMAGE_BUCKET).upload(uploadPath, file);

		if (error) {
			console.error("Error uploading file to Supabase:", error);
			await discardImages();
			await discardVideo();
			return NextResponse.json(
				{
					message: `Failed to upload image ${file.name} to Database. Please try again.`,
				},
				{ status: 500 }
			);
		}
		uploadedImagePaths.push(data.path);
	}
	// --- End Image Upload to Supabase ---

	// 3. Save complaint to the database using Prisma
	try {
		await prismaClient.complaint.create({
			data: {
				customerName: fullname,
				customerEmail: email,
				isPrivate,
				customerPhone: phoneNumber,
				customerAddress: address,
				buildingName: buildingName,
				apartmentNumber: apartmentNumber,
				convenientTime: convenientTime,
				description: description,
				imagePaths: uploadedImagePaths, // Assign the array of paths directly
				videoPaths: [videoPath],
			},
		});
	} catch (dbError) {
		console.error("Error saving complaint to DB:", dbError);
		await discardImages();
		await discardVideo();
		return NextResponse.json({ message: "Failed to save complaint to the database. Please try again." }, { status: 500 });
	}

	// 4. Redirect to a success page
	return NextResponse.json({ message: "Complaint submitted successfully!" }, { status: 200 });
}
