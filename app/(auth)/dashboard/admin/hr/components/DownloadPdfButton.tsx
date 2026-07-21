"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { PdfResult } from "../hrReportActions";

interface DownloadPdfButtonProps {
	getPdf: () => Promise<PdfResult>;
	label?: string;
	size?: "sm" | "default";
	variant?: "default" | "outline" | "ghost";
}

export default function DownloadPdfButton({ getPdf, label = "Download PDF", size = "sm", variant = "outline" }: DownloadPdfButtonProps) {
	const [isLoading, setIsLoading] = useState(false);

	const handleClick = async () => {
		setIsLoading(true);
		try {
			const result = await getPdf();
			if (!result.success) {
				toast.error(result.message);
				return;
			}
			const byteArray = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
			const blob = new Blob([byteArray], { type: result.mime ?? "application/pdf" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = result.fileName;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("PDF download failed:", error);
			toast.error("Failed to generate the PDF. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Button onClick={handleClick} size={size} variant={variant} disabled={isLoading}>
			{isLoading ? (
				<>
					<Loading />
					Generating...
				</>
			) : (
				<>
					<Download className='w-4 h-4 mr-1' />
					{label}
				</>
			)}
		</Button>
	);
}
