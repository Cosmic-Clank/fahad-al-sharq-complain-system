// components/ComplaintResponseForm.tsx
"use client";

import React, { useState, useRef } from "react";
import { useFormStatus } from "react-dom"; // Hook for Server Action status
import { Send } from "lucide-react"; // Icon for submit button
import { addComplaintResponse } from "./actions"; // Import your server action (ensure this path is correct, e.g., '@/actions/complaint-actions')
import { Button } from "@/components/ui/button"; // Assuming this is a Shadcn UI Button or similar

interface ComplaintResponseFormProps {
	complaintId: string; // The ID of the complaint this response belongs to
}

const ComplaintResponseForm: React.FC<ComplaintResponseFormProps> = ({ complaintId }) => {
	const [responseText, setResponseText] = useState("");
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const formRef = useRef<HTMLFormElement>(null); // Ref to reset the form

	// useFormStatus gives us information about the pending state of the form
	// We rename pending to isPending to avoid conflict with the component's own state if any
	const { pending: isPending } = useFormStatus();

	// Handle form submission using the Server Action
	const handleSubmit = async (formData: FormData) => {
		setMessage(null); // Clear previous messages
		if (!responseText.trim()) {
			setMessage({ type: "error", text: "Response cannot be empty." });
			return;
		}

		// Call the server action directly
		const result = await addComplaintResponse(formData);

		if (result.success) {
			setMessage({ type: "success", text: result.message });
			setResponseText(""); // Clear the textarea
			formRef.current?.reset(); // Reset form fields (if any other inputs)
		} else {
			setMessage({ type: "error", text: result.message });
		}
	};

	return (
		// Removed `p-6 pt-0` from here as the parent `ComplaintCard`'s section already handles padding.
		// This div now primarily serves as the container for the form elements.
		<div>
			<h4 className='text-lg font-semibold text-gray-800 mb-3'>Add Response</h4> {/* Toned down size and weight */}
			<form ref={formRef} action={handleSubmit} className='space-y-3'>
				{" "}
				{/* Reduced space-y */}
				{/* Hidden input to pass the complaintId to the server action */}
				<input type='hidden' name='complaintId' value={complaintId} />
				<textarea
					name='responseText' // Important: name attribute matches formData.get() in server action
					value={responseText}
					onChange={(e) => setResponseText(e.target.value)}
					rows={4} // Slightly reduced rows for compactness
					placeholder='Write your response here...'
					className='w-full p-2.5 border border-gray-200 rounded-md shadow-sm focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-gray-700 resize-y text-sm placeholder:text-gray-400 transition-colors' // Reduced padding, less rounded, softer focus ring, smaller text
					disabled={isPending} // Disable textarea when submitting
				></textarea>
				<Button
					type='submit'
					// Assuming the Button component handles its own styling based on default/variant.
					// Removed explicit bg-blue-600, text-white, py-3 px-4, rounded-lg, font-semibold
					// and let the imported Button component handle its professional defaults.
					className='w-full hover:cursor-pointer' // Keep w-full and hover cursor
					disabled={isPending} // Disable button when submitting
				>
					{isPending ? (
						<>
							<svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-current' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
								{" "}
								{/* Smaller spinner, text-current to inherit button text color */}
								<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
								<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
							</svg>
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
