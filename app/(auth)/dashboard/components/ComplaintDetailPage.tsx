// app/complaint/[slug]/page.tsx
// This is a Server Component by default in Next.js App Router
import React from "react";
import { notFound } from "next/navigation"; // For handling 404
import prismaClient from "@/lib/prisma"; // Your Prisma client instance
import ComplaintCard from "./ComplaintCard"; // The Client Component to display the complaint
import { auth } from "@/auth";

// Define the props that this page component will receive
interface ComplaintDetailPageProps {
	slug: string; // The ID of the complaint from the URL
}

// This is your Server Component that fetches data
async function ComplaintDetailPage({ slug }: ComplaintDetailPageProps) {
	const complaintId = Number(slug);
	const session = await auth(); // Get the current user session

	// Fetch the single complaint from the database
	const complaint = await prismaClient.complaint.findUnique({
		where: {
			id: complaintId, // Use the slug as the ID
		},
		select: {
			id: true,
			assignedTo: {
				select: {
					fullName: true,
					role: true,
				},
			},
			customerName: true,
			customerPhone: true,
			buildingName: true,
			apartmentNumber: true,
			area: true,
			description: true,

			imagePaths: true, // Prisma will return the JSON string

			createdAt: true, // Prisma returns a Date object
			responses: {
				select: {
					id: true,
					response: true,
					createdAt: true, // When the response was made
					responder: {
						select: {
							fullName: true, // Assuming you have a name field in your user model
							role: true, // Assuming you have a role field in your user model
						},
					},
					imagePaths: true, // Assuming this is an array of image URLs for the response
				},
				orderBy: { createdAt: "asc" },
			},
			workTimes: {
				select: {
					id: true,
					date: true, // Date of the work time entry
					startTime: true, // Start time of the work
					endTime: true, // End time of the work
					user: {
						select: {
							fullName: true, // Assuming you have a name field in your user model
							role: true, // Assuming you have a role field in your user model
						},
					},
				},
				orderBy: { date: "asc" }, // Order by date ascending
			},
		},
	});

	// Handle case where complaint is not found
	if (!complaint) {
		notFound(); // Renders Next.js's default 404 page
	}

	// Serialize the data for the Client Component
	// Date objects must be converted to strings (e.g., ISO string)
	// JSON string imagePaths must be parsed into an array
	const formattedComplaint = {
		...complaint,
		currentUser: {
			fullName: session!.user!.name!,
			role: (session!.user as any).role,
		},
		id: String(complaint.id), // Ensure ID is string if it's a number/BigInt
		createdAt: complaint.createdAt.toLocaleString(), // Convert Date to local string
		assignedTo: complaint.assignedTo, // Ensure assignedTo is a string or null
		apartmentNumber: complaint.apartmentNumber, // Ensure apartmentNumber is a string
		// IMPORTANT: Parse imagePaths if they are stored as JSON strings in the DB
		imagePaths: complaint.imagePaths.map((imagePath) => `https://koxptzqfmeasndsaecyo.supabase.co/storage/v1/object/public/complaint-images/${imagePath}`),
		// Format responses to match ComplaintData type
		responses: complaint.responses.map((resp) => ({
			id: String(resp.id),
			response: resp.response,
			createdAt: resp.createdAt instanceof Date ? resp.createdAt.toLocaleString() : String(resp.createdAt),
			responder: {
				fullName: resp.responder.fullName,
				role: String(resp.responder.role),
			},
			imagePaths: resp.imagePaths.map((imagePath) => `https://koxptzqfmeasndsaecyo.supabase.co/storage/v1/object/public/complaint-images/${imagePath}`), // Ensure imagePaths is an array
		})),
		workTimes: complaint.workTimes.map((wt) => ({
			id: String(wt.id),
			date: wt.date instanceof Date ? wt.date.toISOString().split("T")[0] : String(wt.date), // Format date as YYYY-MM-DD
			startTime: wt.startTime instanceof Date ? wt.startTime.toLocaleTimeString() : String(wt.startTime), // Format time as HH:MM:SS
			endTime: wt.endTime instanceof Date ? wt.endTime.toLocaleTimeString() : String(wt.endTime), // Format time as HH:MM:SS
			user: {
				fullName: wt.user.fullName,
				role: wt.user.role, // Ensure role is a string
			},
		}))[0],
	};

	return (
		<div className=' bg-gray-100 h-full'>
			{/* Pass the formatted single complaint object to the Client Component */}
			<ComplaintCard complaint={formattedComplaint} />
		</div>
	);
}

export default ComplaintDetailPage;
