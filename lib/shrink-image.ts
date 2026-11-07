// Client-side: phone photos of bills are often 5–10MB. Re-encode large images as a
// smaller JPEG before upload so they fit the server-action limit. PDFs and small
// images are returned unchanged.

const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024;
const MAX_SIDE = 2000;

export async function shrinkImageIfLarge(file: File): Promise<File> {
	if (!file.type.startsWith("image/") || file.size <= SHRINK_ABOVE_BYTES) return file;
	try {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement("canvas");
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		const ctx = canvas.getContext("2d");
		if (!ctx) return file;
		ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close();
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
		if (!blob || blob.size >= file.size) return file;
		return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
	} catch {
		return file; // the server still checks size/type
	}
}
