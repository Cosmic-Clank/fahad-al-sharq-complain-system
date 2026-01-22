// app/success/page.tsx (assuming this is the path)
import React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function SuccessPage() {
	return (
		<div className='flex items-center justify-center min-h-screen bg-gray-50 p-4'>
			{" "}
			{/* Slightly reduced overall padding */}
			<div className='w-full max-w-sm bg-white rounded-lg shadow-lg p-6 text-center border border-green-200'>
				{" "}
				{/* Reduced max-width and padding */}
				<div className='mb-4 flex justify-center'>
					{" "}
					{/* Reduced margin-bottom */}
					{/* Success Icon - Smaller size */}
					<CheckCircle2 className='h-16 w-16 text-green-500 animate-scale-in' /> {/* Reduced icon size */}
				</div>
				{/* Title - Smaller size and less bold */}
				<h1 className='text-2xl sm:text-3xl font-bold text-gray-800 mb-2'>
					{" "}
					{/* Reduced text size and font-weight */}
					Complaint Submitted Successfully!
				</h1>
				{/* Description - Smaller size and more compact */}
				<p className='text-sm sm:text-base text-gray-600 leading-relaxed mb-6'>
					{" "}
					{/* Reduced text size and margin-bottom */}
					Thank you for submitting your complaint.
					<br />
					We appreciate your feedback and will review it promptly.
					<br />
					Please check your email for responses within 2-3 business days.
				</p>
				{/* Call-to-action Button - Smaller padding and text */}
				<Link href='/' passHref>
					<Button className='w-full hover:cursor-pointer  '>
						{" "}
						{/* Reduced padding, text size, and shadow */}
						Go to Home Page
					</Button>
				</Link>
			</div>
		</div>
	);
}

export default SuccessPage;
