"use client";

import React, { useEffect, useMemo } from "react";
import Image from "next/image";
import { Camera, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { translateMessage } from "@/lib/messages-ar";
import { EVIDENCE_MESSAGES, IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES, MAX_VIDEO_BYTES, videoContentType } from "@/lib/complaint-evidence";

interface ComplaintEvidenceUploadProps {
	images: File[];
	onImagesChange: (files: File[]) => void;
	video: File | null;
	onVideoChange: (file: File | null) => void;
	onError: (message: string | null) => void;
	disabled?: boolean;
	/** 0–100 while the video is uploading, otherwise null. */
	videoProgress?: number | null;
}

/** Required photo + video evidence inputs for the customer complaint forms. */
export default function ComplaintEvidenceUpload({ images, onImagesChange, video, onVideoChange, onError, disabled, videoProgress }: ComplaintEvidenceUploadProps) {
	const videoUrl = useMemo(() => (video ? URL.createObjectURL(video) : null), [video]);
	useEffect(() => () => (videoUrl ? URL.revokeObjectURL(videoUrl) : undefined), [videoUrl]);

	const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if (files.length > MAX_IMAGES) {
			onError(translateMessage(`You can upload a maximum of ${MAX_IMAGES} images.`));
			e.target.value = "";
			return;
		}
		if (files.some((file) => file.size > MAX_IMAGE_BYTES || !IMAGE_TYPES.includes(file.type))) {
			onError(translateMessage(EVIDENCE_MESSAGES.invalidImages));
			e.target.value = "";
			return;
		}
		onError(null);
		onImagesChange(files);
	};

	const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] ?? null;
		if (file && (file.size > MAX_VIDEO_BYTES || !videoContentType(file))) {
			onError(translateMessage(EVIDENCE_MESSAGES.invalidVideo));
			e.target.value = "";
			onVideoChange(null);
			return;
		}
		onError(null);
		onVideoChange(file);
	};

	return (
		<div className='space-y-4'>
			{/* Photos */}
			<div className='p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800'>
				<Label className='flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
					<Camera className='w-4 h-4' /> Upload Photos <span className='text-red-500'>*</span>
				</Label>
				<p className='text-xs text-gray-500 mb-2'>Required — 1 to {MAX_IMAGES} photos of the problem (JPEG or PNG, max 5MB each).</p>
				<Input accept='image/jpeg,image/png' type='file' multiple name='images' onChange={handleImages} disabled={disabled} className='w-full' />
				{images.length > 0 ? (
					<div className='mt-2'>
						<p className='text-sm text-gray-500 dark:text-gray-400 mb-2'>Selected files: {images.length}</p>
						<div className='flex flex-wrap gap-2'>
							{images.map((file, idx) => (
								<div key={idx} className='w-20 h-20 border rounded overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-900'>
									<Image width={100} height={100} src={URL.createObjectURL(file)} alt={file.name} className='object-cover w-full h-full' onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
								</div>
							))}
						</div>
					</div>
				) : (
					<p className='text-sm text-gray-500 dark:text-gray-400 mt-2'>No files selected</p>
				)}
			</div>

			{/* Video */}
			<div className='p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800'>
				<Label className='flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
					<Video className='w-4 h-4' /> Upload Video <span className='text-red-500'>*</span>
				</Label>
				<p className='text-xs text-gray-500 mb-2'>Required — 1 video showing the problem (MP4, MOV, WebM or 3GP, max {MAX_VIDEO_BYTES / (1024 * 1024)}MB).</p>
				<Input accept='video/mp4,video/quicktime,video/webm,video/3gpp,.mp4,.mov,.m4v,.webm,.3gp' type='file' name='video' onChange={handleVideo} disabled={disabled} className='w-full' />
				{video && videoUrl ? (
					<div className='mt-2 space-y-1'>
						<video src={videoUrl} controls preload='metadata' className='w-full max-w-sm rounded border bg-black' />
						<p className='text-xs text-gray-500'>
							{video.name} — {(video.size / (1024 * 1024)).toFixed(1)} MB
						</p>
					</div>
				) : (
					<p className='text-sm text-gray-500 dark:text-gray-400 mt-2'>No video selected</p>
				)}
				{videoProgress != null && (
					<div className='mt-3'>
						<div className='h-2 w-full rounded bg-gray-200 overflow-hidden'>
							<div className='h-full bg-primary transition-all' style={{ width: `${videoProgress}%` }} />
						</div>
						<p className='text-xs text-gray-600 mt-1'>Uploading video… {videoProgress}%</p>
					</div>
				)}
			</div>
		</div>
	);
}
