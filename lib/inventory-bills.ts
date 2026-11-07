// Server-only helpers for restock bills in the private "inventory-bills" bucket.
import { nanoid } from "nanoid";
import supabaseAdminClient from "./supabaseAdmin";
import { BILL_BUCKET, BILL_TYPES, MAX_BILL_BYTES } from "./inventory-bill-rules";

/** Upload a bill; returns its storage path, or why it was refused (bad file / storage error). */
export async function uploadBill(file: File): Promise<{ path: string } | { error: "invalid" | "upload" }> {
	const ext = BILL_TYPES[file.type];
	if (!ext || file.size === 0 || file.size > MAX_BILL_BYTES) return { error: "invalid" };
	// One folder per month keeps the bucket browsable in the Supabase dashboard
	const month = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 7);
	const { data, error } = await supabaseAdminClient.storage.from(BILL_BUCKET).upload(`${month}/${nanoid()}.${ext}`, file, { contentType: file.type, upsert: false });
	if (error || !data) {
		console.error("Error uploading restock bill:", error);
		return { error: "upload" };
	}
	return { path: data.path };
}

export async function removeBill(path: string): Promise<void> {
	await supabaseAdminClient.storage.from(BILL_BUCKET).remove([path]).catch(() => undefined);
}

/** Short-lived links for showing bills on a page (the bucket is private). path → url */
export async function signedBillUrls(paths: string[], expiresInSeconds = 60 * 60): Promise<Map<string, string>> {
	const unique = [...new Set(paths.filter(Boolean))];
	const urls = new Map<string, string>();
	if (unique.length === 0) return urls;
	const { data, error } = await supabaseAdminClient.storage.from(BILL_BUCKET).createSignedUrls(unique, expiresInSeconds);
	if (error) {
		console.error("Error signing bill URLs:", error);
		return urls;
	}
	for (const row of data ?? []) {
		if (row.path && row.signedUrl) urls.set(row.path, row.signedUrl);
	}
	return urls;
}
