// components/ComplaintCard.tsx
"use client"; // This component will be interactive on the client

import React, { useState } from "react";
import Image from "next/image"; // For optimized images
import { Phone, FileText, MapPin, Calendar, Image as ImageIcon, CornerDownRight, XCircle, MessageSquare, User } from "lucide-react"; // Icons

import ComplaintResponseForm from "./ComplaintResponseForm"; // Import the response form
import Link from "next/link";

// Define the data type for a single complaint
interface ComplaintData {
	id: string;
	customerName: string;
	customerPhone: string;
	billNumber: string;
	area: string;
	description: string;
	imagePaths: string[]; // Array of image URLs
	createdAt: string; // ISO string from the server
	responses: {
		id: string;
		response: string; // The actual response text
		createdAt: string; // When this specific response was created (ISO string)
		responder: {
			// Details of the user who made the response
			fullName: string;
			role: string;
		};
	}[];
}

interface ComplaintCardProps {
	complaint: ComplaintData;
}

const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint }) => {
	const [showFullDescription, setShowFullDescription] = useState(false);
	const maxDescriptionLength = 150; // Max characters before truncation

	const toggleDescription = () => {
		setShowFullDescription(!showFullDescription);
	};

	const displayDescription = complaint.description.length > maxDescriptionLength && !showFullDescription ? `${complaint.description.substring(0, maxDescriptionLength)}...` : complaint.description;

	return (
		// Softer shadow, slightly reduced hover effect, less prominent overall.
		<div className='bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden'>
			{/* Header - Flat, lighter background instead of gradient, smaller text */}
			<div className='p-5 pb-3 border-b border-gray-100 bg-gray-50'>
				<h3 className='text-xl font-semibold text-gray-800 mb-1'>{complaint.customerName}</h3>
				<p className='text-xs text-gray-500 flex items-center'>
					<FileText className='w-3.5 h-3.5 mr-1 text-gray-400' />
					Bill No: <span className='font-medium text-gray-700 ml-1'>{complaint.billNumber}</span>
				</p>
			</div>

			{/* Body Content - Slightly reduced padding, smaller gaps */}
			<div className='p-5'>
				<div className='grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 mb-5'>
					{/* Phone */}
					<div className='flex items-center text-gray-700'>
						<Phone className='w-4 h-4 mr-2 text-blue-500' /> {/* Slightly smaller icon, slightly toned-down blue */}
						<span className='font-medium mr-1'>Phone:</span> {/* Reduced font weight */}
						<span className='text-base'>{complaint.customerPhone}</span> {/* Reduced size */}
					</div>
					{/* Area */}
					<div className='flex items-center text-gray-700'>
						<MapPin className='w-4 h-4 mr-2 text-green-500' /> {/* Slightly smaller icon, slightly toned-down green */}
						<span className='font-medium mr-1'>Area:</span> {/* Reduced font weight */}
						<span className='text-base'>{complaint.area}</span> {/* Reduced size */}
					</div>
				</div>

				{/* Description - Smaller header, smaller text */}
				<div className='mb-5 text-gray-700 leading-relaxed'>
					<p className='font-semibold text-gray-800 mb-2 flex items-center text-base'>
						<CornerDownRight className='w-4 h-4 mr-2 text-purple-500' /> {/* Smaller icon, slightly toned-down purple */}
						Description:
					</p>
					<p className='whitespace-pre-wrap text-sm'>
						{" "}
						{/* Reduced text size */}
						{displayDescription}
						{complaint.description.length > maxDescriptionLength && (
							<button onClick={toggleDescription} className='text-blue-600 hover:text-blue-800 font-medium ml-1 inline-flex items-center text-xs'>
								{" "}
								{/* Smaller text for button */}
								{showFullDescription ? "Read Less" : "Read More"}
							</button>
						)}
					</p>
				</div>

				{/* Images - Smaller header, smaller grid gap, smaller image height, less rounded */}
				{complaint.imagePaths && complaint.imagePaths.length > 0 && (
					<div className='mb-5'>
						<p className='font-semibold text-gray-800 mb-3 flex items-center text-base'>
							<ImageIcon className='w-4 h-4 mr-2 text-orange-500' /> {/* Smaller icon, slightly toned-down orange */}
							Attached Images:
						</p>
						<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
							{" "}
							{/* Reduced gap */}
							{complaint.imagePaths.map((path, index) => (
								<div key={index} className='relative w-full h-24 rounded-md overflow-hidden bg-gray-100 border border-gray-200 shadow-sm'>
									{" "}
									{/* Reduced height, less rounded */}
									<Link href={path} target='_blank' rel='noopener noreferrer'>
										{" "}
										{/* Link to open image in new tab */}
										<Image src={path} alt={`Complaint Image ${index + 1}`} fill sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw' style={{ objectFit: "cover" }} className='transition-transform duration-200 hover:scale-105' />
									</Link>
								</div>
							))}
						</div>
					</div>
				)}
				{complaint.imagePaths && complaint.imagePaths.length === 0 && (
					<div className='mb-5 text-gray-500 flex items-center justify-center py-3 border rounded-md bg-gray-50 text-sm'>
						{" "}
						{/* Reduced padding, smaller text */}
						<XCircle className='w-4 h-4 mr-2' /> No images attached for this complaint.
					</div>
				)}
			</div>

			{/* NEW: Past Responses Section - Slightly reduced padding, smaller text elements, lighter borders */}
			<div className='p-5 pt-0 border-t border-gray-100 bg-white'>
				{" "}
				{/* Toned down background, consistent border */}
				<h4 className='text-lg font-semibold text-gray-800 mb-3 flex items-center'>
					{" "}
					{/* Reduced size */}
					<MessageSquare className='w-4 h-4 mr-2 text-indigo-500' /> Past Responses ({complaint.responses.length}) {/* Smaller icon, toned-down indigo */}
				</h4>
				{complaint.responses.length > 0 ? (
					<div className='space-y-3'>
						{" "}
						{/* Reduced vertical space */}
						{complaint.responses
							.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) // Sort by oldest first
							.map((response) => (
								<div key={response.id} className='bg-gray-50 p-3 rounded-md border border-gray-200 shadow-sm'>
									{" "}
									{/* Reduced padding, less rounded */}
									<div className='flex items-center justify-between text-xs text-gray-600 mb-1.5'>
										{" "}
										{/* Reduced text size, adjusted margin */}
										<span className='flex items-center font-medium text-gray-700'>
											{" "}
											{/* Reduced font weight */}
											<User className='w-3.5 h-3.5 mr-1 text-gray-500' /> {/* Smaller icon */}
											{response.responder.fullName} ({response.responder.role})
										</span>
										<span className='text-xs text-gray-500'>{new Date(response.createdAt).toLocaleString()}</span>
									</div>
									<p className='text-gray-700 leading-relaxed text-sm whitespace-pre-wrap'>{response.response}</p> {/* Reduced text size, slightly darker text */}
								</div>
							))}
					</div>
				) : (
					<div className='text-gray-500 text-center py-3 border rounded-md bg-white text-sm'>No responses yet.</div>
				)}
			</div>

			{/* Complaint Response Form - Consistent background and padding */}
			<div className='bg-gray-50 border-t border-gray-100 p-5'>
				{" "}
				{/* Reduced padding */}
				<ComplaintResponseForm complaintId={complaint.id} />
			</div>

			{/* Footer (Created At) - Reduced padding, smaller text */}
			<div className='p-3 text-right text-xs text-gray-500 bg-gray-50 mt-auto'>
				<p className='flex items-center justify-end'>
					<Calendar className='w-3.5 h-3.5 mr-1 text-gray-400' /> {/* Smaller icon */}
					Filed: {new Date(complaint.createdAt).toLocaleString()}
				</p>
			</div>
		</div>
	);
};

export default ComplaintCard;
