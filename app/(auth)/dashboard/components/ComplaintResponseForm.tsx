// components/ComplaintResponseForm.tsx
"use client";

import React, { useState, useRef } from "react";
import { useFormStatus } from "react-dom"; // Hook for Server Action status
import { Send } from "lucide-react"; // Icon for submit button
import { addComplaintResponse } from "./actions"; // Import your server action (ensure this path is correct, e.g., '@/actions/complaint-actions')
import { Button } from "@/components/ui/button"; // Assuming this is a Shadcn UI Button or similar
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image"; // For displaying uploaded images
import { Loading } from "@/components/ui/loading";

interface ComplaintResponseFormProps {
	complaintId: string; // The ID of the complaint this response belongs to
}

const predefinedResponses = {
	HVAC: ["HVAC UNIT NOT COOLING", "HVAC UNIT NOT WORKING", "HVAC UNIT in is producing excessive noise", "WATER LEAKAGE FROM HVAC UNIT", "HVAC UNIT SHUTTING DOWN AUTOMATICALLY", "Unusual smell coming from HVAC unit", "HVAC DUCT ISSUES", "Thermostat issues or not responding", "High energy bills or inefficiency", "Ice buildup is occurring on the HVAC unit", "The HVAC unit is over-cooling"],
	Others: ["PLUMBING WORK", "ELECTRIC WORK", "CIVIL WORK", "PAINTING WORK"],
};

const ComplaintResponseForm: React.FC<ComplaintResponseFormProps> = ({ complaintId }) => {
	const [responseText, setResponseText] = useState("");
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const formRef = useRef<HTMLFormElement>(null); // Ref to reset the form
	const [images, setImages] = React.useState<File[]>([]);

	// useFormStatus gives us information about the pending state of the form
	// We rename pending to isPending to avoid conflict with the component's own state if any
	const [loading, isLoading] = useState<boolean>(false);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const selectedFiles = Array.from(e.target.files);
			const maxImages = 5;
			const maxSize = 5 * 1024 * 1024; // 5MB
			const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

			if (selectedFiles.length > maxImages) {
				alert(`You can upload a maximum of ${maxImages} images.`);
				e.target.value = ""; // Clear the input
				return;
			}

			const invalidFiles = selectedFiles.filter((file) => file.size > maxSize || !allowedTypes.includes(file.type));
			if (invalidFiles.length > 0) {
				alert(`Some files are invalid: Max size is 5MB, supported types are ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}.`);
				e.target.value = ""; // Clear the input
				return;
			}
			setImages(selectedFiles);
		}
	};

	// Handle form submission using the Server Action
	const handleSubmit = async (formData: FormData) => {
		setMessage(null); // Clear previous messages
		if (!responseText.trim()) {
			setMessage({ type: "error", text: "Please select a response." });
			return;
		}
		isLoading(true); // Set loading state to true
		// formData.delete("images"); // Clear any previous images to avoid duplicates
		// images.forEach((file) => {
		// 	formData.append("images", file);
		// });
		// Call the server action directly

		const result = await addComplaintResponse(formData);

		if (result.success) {
			setMessage({ type: "success", text: result.message });
			setResponseText(""); // Clear the textarea
			isLoading(false); // Set loading state to true

			formRef.current?.reset(); // Reset form fields (if any other inputs)
			window.location.reload(); // Reload the page to reflect the new response
		} else {
			setMessage({ type: "error", text: result.message });
			isLoading(false); // Set loading state to true
		}
	};

	return (
		// Removed `p-6 pt-0` from here as the parent `ComplaintCard`'s section already handles padding.
		// This div now primarily serves as the container for the form elements.
		<div>
			<h4 className='text-lg font-semibold text-gray-800 mb-3'>Add Response</h4> {/* Toned down size and weight */}
			<form
				ref={formRef}
				onSubmit={async (e) => {
					e.preventDefault(); // Prevent default form submission
					const formData = new FormData(e.currentTarget);
					await handleSubmit(formData);
				}}
				className='space-y-3'>
				{" "}
				{/* Reduced space-y */}
				{/* Hidden input to pass the complaintId to the server action */}
				<input type='hidden' name='complaintId' value={complaintId} />
				<input type='hidden' name='responseText' value={responseText} />
				{/* HVAC Issues Section */}
				<div>
					<h5 className='text-sm font-semibold text-gray-700 mb-2'>HVAC Issues</h5>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
						{predefinedResponses.HVAC.map((response) => (
							<Button key={response} type='button' onClick={() => setResponseText(response)} variant={responseText === response ? "default" : "outline"} className='justify-start text-left text-xs h-auto py-2 px-3' disabled={loading}>
								{response}
							</Button>
						))}
					</div>
				</div>
				{/* Others Section */}
				<div>
					<h5 className='text-sm font-semibold text-gray-700 mb-2'>Others</h5>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
						{predefinedResponses.Others.map((response) => (
							<Button key={response} type='button' onClick={() => setResponseText(response)} variant={responseText === response ? "default" : "outline"} className='justify-start text-left text-xs h-auto py-2 px-3' disabled={loading}>
								{response}
							</Button>
						))}
					</div>
				</div>
				{/* Selected Response Display */}
				{responseText && (
					<div className='p-3 bg-blue-50 border border-blue-200 rounded-md'>
						<p className='text-sm text-gray-700'>
							<span className='font-semibold'>Selected Response:</span> {responseText}
						</p>
					</div>
				)}
				<div className='p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800'>
					<Label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Upload Images (Optional)</Label>
					<Input
						accept='image/*'
						type='file'
						multiple
						name='images' // IMPORTANT: This name attribute matches formData.getAll('images') in Server Action
						onChange={(e) => {
							if (e.target.files && e.target.files.length > 5) {
								alert("You can upload a maximum of 5 images.");
								e.target.value = "";
								return;
							}
							handleFileChange(e);
						}}
						className='w-full'
					/>
					{images.length > 0 && (
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
					)}
					{images.length === 0 && <p className='text-sm text-gray-500 dark:text-gray-400 mt-2'>No files selected</p>}
				</div>
				<Button
					type='submit'
					// Assuming the Button component handles its own styling based on default/variant.
					// Removed explicit bg-blue-600, text-white, py-3 px-4, rounded-lg, font-semibold
					// and let the imported Button component handle its professional defaults.
					className='w-full hover:cursor-pointer' // Keep w-full and hover cursor
					disabled={loading} // Disable button when submitting
				>
					{loading ? (
						<>
							<Loading />
							Submitting...
						</>
					) : (
						<>
							<Send className='w-4 h-4 mr-2' /> {/* Reduced icon size */}
							Send Response
						</>
					)}
				</Button>
				{message && (
					<div className={`p-2.5 rounded-md text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
						{" "}
						{/* Slightly reduced padding, lighter background, added subtle border */}
						{message.text}
					</div>
				)}
			</form>
		</div>
	);
};

export default ComplaintResponseForm;
