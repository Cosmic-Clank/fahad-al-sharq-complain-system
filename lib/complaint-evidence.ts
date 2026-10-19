/**
 * Evidence rules for customer complaints: at least one photo AND exactly one video.
 * Shared by the complaint forms (client) and /api/complaints (server).
 *
 * Photos go through /api/complaints as multipart (small). The video is too big
 * for a request body, so the browser uploads it straight to Supabase Storage via
 * a signed upload URL from /api/complaints/video-upload-url and only sends the
 * resulting path to /api/complaints.
 */

export const IMAGE_BUCKET = "complaint-images";
export const VIDEO_BUCKET = "complaint-videos";

export const MIN_IMAGES = 1;
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // Supabase project cap is 50MB while the spend cap is on
/** Allowed video MIME types → file extension used for the stored object. */
export const VIDEO_TYPES: Record<string, string> = {
	"video/mp4": "mp4",
	"video/quicktime": "mov", // iPhone
	"video/webm": "webm",
	"video/3gpp": "3gp", // older Android
};
/** Some phones/browsers leave File.type empty — fall back to the extension. */
const VIDEO_EXTENSION_TYPES: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", "3gp": "video/3gpp" };

/** Stored video object names look like `<21-char nanoid>.<ext>`. */
export const VIDEO_PATH_PATTERN = /^[A-Za-z0-9_-]{21}\.(mp4|mov|webm|3gp)$/;

export function videoContentType(file: { name: string; type: string }): string | null {
	if (VIDEO_TYPES[file.type]) return file.type;
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	return VIDEO_EXTENSION_TYPES[ext] ?? null;
}

export function publicVideoUrl(path: string): string {
	return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${VIDEO_BUCKET}/${path}`;
}

/** Validation messages (keep in sync with lib/messages-ar.ts). */
export const EVIDENCE_MESSAGES = {
	photoRequired: "Please attach at least one photo of the problem.",
	videoRequired: "Please attach a video of the problem.",
	invalidImages: "Some photos are invalid: max size is 5MB, supported types are JPEG and PNG.",
	invalidVideo: "Invalid video: max size is 50MB, supported formats are MP4, MOV, WebM and 3GP.",
	videoUploadFailed: "Failed to upload the video. Please check your connection and try again.",
	videoMissing: "The video upload could not be found. Please attach the video again.",
};
