"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SignaturePadHandle {
	isEmpty: () => boolean;
	toDataURL: () => string;
	clear: () => void;
}

interface SignaturePadProps {
	label: string;
	/** Called with true when the pad becomes empty, false once something is drawn. */
	onEmptyChange?: (empty: boolean) => void;
	disabled?: boolean;
}

/**
 * Signature box that fills its container. No fixed canvas width is passed, so
 * react-signature-canvas sizes the canvas to the element (and to the device
 * pixel ratio) — strokes stay under the finger on phones.
 */
const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad({ label, onEmptyChange, disabled }, ref) {
	const padRef = useRef<SignatureCanvas>(null);

	const clear = () => {
		padRef.current?.clear();
		onEmptyChange?.(true);
	};

	// react-signature-canvas wipes the drawing on window resize (rotation, phone keyboard)
	// without calling onEnd — report the now-empty pad so "signed" flags don't go stale
	useEffect(() => {
		if (!onEmptyChange) return;
		const onResize = () => setTimeout(() => {
			if (padRef.current?.isEmpty()) onEmptyChange(true);
		}, 0);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [onEmptyChange]);

	useImperativeHandle(ref, () => ({
		isEmpty: () => padRef.current?.isEmpty() ?? true,
		toDataURL: () => padRef.current?.toDataURL("image/png") ?? "",
		clear,
	}));

	return (
		<div className='space-y-1'>
			<div className='flex items-center justify-between'>
				<span className='text-sm font-medium'>{label}</span>
				<Button type='button' variant='ghost' size='sm' onClick={clear} disabled={disabled}>
					<Eraser className='w-4 h-4 mr-1' /> Clear
				</Button>
			</div>
			<div className={`relative rounded-md border-2 border-dashed bg-white ${disabled ? "opacity-50 pointer-events-none" : "border-gray-300"}`}>
				<SignatureCanvas ref={padRef} onEnd={() => onEmptyChange?.(false)} canvasProps={{ className: "block w-full h-40 touch-none" }} />
				<span className='pointer-events-none absolute bottom-2 left-3 right-3 border-t border-gray-300 pt-1 text-[11px] text-gray-400'>Sign here with your finger or mouse</span>
			</div>
		</div>
	);
});

export default SignaturePad;
