import { EVIDENCE_MESSAGES, videoContentType } from "./complaint-evidence";

export class VideoUploadError extends Error {}

/**
 * Uploads the complaint video straight to Supabase Storage and returns its
 * stored path. Uses XHR (not fetch) so large uploads can report progress.
 */
export async function uploadComplaintVideo(file: File, location: { buildingName: string; apartmentNumber: string }, onProgress?: (percent: number) => void): Promise<string> {
	const contentType = videoContentType(file);
	if (!contentType) throw new VideoUploadError(EVIDENCE_MESSAGES.invalidVideo);

	const res = await fetch("/api/complaints/video-upload-url", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ contentType, size: file.size, ...location }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new VideoUploadError(data.message || EVIDENCE_MESSAGES.videoUploadFailed);

	await new Promise<void>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("PUT", data.signedUrl);
		xhr.setRequestHeader("Content-Type", contentType);
		xhr.setRequestHeader("x-upsert", "false");
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
		};
		xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new VideoUploadError(EVIDENCE_MESSAGES.videoUploadFailed)));
		xhr.onerror = () => reject(new VideoUploadError(EVIDENCE_MESSAGES.videoUploadFailed));
		xhr.send(file);
	});

	return data.path as string;
}
