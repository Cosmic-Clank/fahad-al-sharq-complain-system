// app/not-authorized/page.tsx (or components/NotAuthorized.tsx)
"use client";

import React from "react";
import Link from "next/link";
import { Lock } from "lucide-react"; // Using Lock icon
import { Button } from "@/components/ui/button"; // Shadcn UI Button

function NotAuthorized() {
	return (
		<div className='flex items-center justify-center min-h-screen bg-gray-50 p-3'>
			{" "}
			{/* Reduced overall padding */}
			<div className='w-full max-w-xs bg-white rounded-lg shadow-md p-4 text-center border border-yellow-200'>
				{" "}
				{/* Reduced max-width and padding, lighter shadow */}
				<div className='mb-3 flex justify-center'>
					{" "}
					{/* Reduced margin-bottom */}
					{/* Not Authorized Icon - Even Smaller Size */}
					<Lock className='h-12 w-12 text-yellow-500 animate-scale-in' /> {/* Significantly reduced icon size */}
				</div>
				{/* Title - Smaller Size */}
				<h1 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>
					{" "}
					{/* Reduced text size */}
					Access Denied
				</h1>
				{/* Description - Smaller Size and more compact */}
				<p className='text-sm text-gray-600 leading-normal mb-5'>
					{" "}
					{/* Reduced text size and line-height, slightly less mb */}
					You do not have permission to view this page.
					<br />
					Please log in or contact support.
				</p>
				{/* Call-to-action Buttons - Smaller padding and text */}
				<div className='flex flex-col sm:flex-row justify-center gap-2'>
					{" "}
					{/* Reduced gap */}
					<Link href='/' passHref>
						<Button className='hover:cursor-pointer'>
							{" "}
							{/* Reduced padding and text size, lighter shadow */}
							Go to Home
						</Button>
					</Link>
					<Link href='/login' passHref>
						<Button variant='outline' className='hover:cursor-pointer'>
							{" "}
							{/* Reduced padding and text size, lighter shadow */}
							Login Page
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}

export default NotAuthorized;
