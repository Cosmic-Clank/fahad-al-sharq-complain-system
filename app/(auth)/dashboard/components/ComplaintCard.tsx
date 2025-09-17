// components/ComplaintCard.tsx
"use client";

import React, { useState } from "react";
import { Phone, FileText, Calendar, Image as ImageIcon, CornerDownRight, XCircle, MessageSquare, User, PersonStandingIcon, PinIcon, House, Download } from "lucide-react";

import ComplaintResponseForm from "./ComplaintResponseForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { addEndWorkTime, addStartWorkTime } from "./actions";
import { Loading } from "@/components/ui/loading";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AssignmentForm from "./AssignmentForm";
import { generateComplaintPdfById } from "./reportActions";

// NEW: shadcn dialog + inputs
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Define the data type for a single complaint
interface ComplaintData {
	currentUser: { fullName: string; role: string };
	id: string;
	assignedTo?: { fullName: string; role: string } | null;
	customerName: string;
	customerPhone: string;
	buildingName: string;
	apartmentNumber: string;
	convenientTime: string;
	description: string;
	imagePaths: string[];
	createdAt: String;
	responses: {
		id: string;
		response: string;
		createdAt: String;
		responder: { fullName: string; role: string };
		imagePaths: string[];
	}[];
	workTimes: {
		id: string;
		date: string;
		startTime: string;
		endTime: string;
		user: { fullName: string; role: string };
		customerInitials: string | null;
		workerInitials: string | null;
	};
}

interface ComplaintCardProps {
	complaint: ComplaintData;
}

const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint }) => {
	const [showFullDescription, setShowFullDescription] = useState(false);
	const maxDescriptionLength = 150;

	const [isWorkTimesLoading, setIsWorkTimesLoading] = useState(false);

	// NEW: dialog state + initials
	const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
	const [workerInitials, setWorkerInitials] = useState("");
	const [customerInitials, setCustomerInitials] = useState("");
	const [endError, setEndError] = useState<string | null>(null);

	const toggleDescription = () => setShowFullDescription(!showFullDescription);

	const displayDescription = complaint.description.length > maxDescriptionLength && !showFullDescription ? `${complaint.description.substring(0, maxDescriptionLength)}...` : complaint.description;

	// NEW: confirm handler (mimics the original form submit)
	const handleConfirmEndWork = async () => {
		setEndError(null);
		if (!workerInitials.trim() || !customerInitials.trim()) {
			setEndError("Please enter both initials.");
			return;
		}
		setIsWorkTimesLoading(true);
		try {
			const fd = new FormData();
			fd.append("complaintId", complaint.id);
			// If you later want to pass initials to the server, just append them here:
			fd.append("workerInitials", workerInitials.trim());
			fd.append("customerInitials", customerInitials.trim());

			const result = await addEndWorkTime(fd);

			if (result.success) {
				window.location.reload();
			} else {
				setEndError(result.message || "Could not end work. Please try again.");
			}
		} catch (e) {
			setEndError("Something went wrong. Please try again.");
		} finally {
			setIsWorkTimesLoading(false);
		}
	};

	return (
		<div className='bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden'>
			{/* Header */}
			<div className='p-5 pb-3 border-b border-gray-100 bg-gray-50'>
				<h3 className='text-xl font-semibold text-gray-800 mb-1'>{complaint.customerName}</h3>
				<p className='text-xs text-gray-500 flex items-center'>
					<PersonStandingIcon className='w-3.5 h-3.5 mr-1 text-gray-400' />
					Assigned To:
					<span className='font-medium text-gray-700 ml-1'>{complaint.assignedTo ? complaint.assignedTo.fullName + " (" + complaint.assignedTo.role + ")" : "-"}</span>
					{complaint.currentUser.role === "ADMIN" && (
						<Popover>
							<PopoverTrigger asChild>
								<Button variant='ghost' className='p-1 text-gray-500 hover:text-gray-700'>
									<PinIcon className='w-4 h-4' />
								</Button>
							</PopoverTrigger>
							<PopoverContent>
								<AssignmentForm complaintId={Number(complaint.id)} />
							</PopoverContent>
						</Popover>
					)}
				</p>
				<p className='text-xs text-gray-500 flex items-center'>
					<FileText className='w-3.5 h-3.5 mr-1 text-gray-400' />
					Building Name: <span className='font-medium text-gray-700 ml-1'>{complaint.buildingName}</span>
				</p>
				<p className='text-xs text-gray-500 flex items-center'>
					<House className='w-3.5 h-3.5 mr-1 text-gray-400' />
					Apartment Number: <span className='font-medium text-gray-700 ml-1'>{complaint.apartmentNumber}</span>
				</p>
				<p className='text-xs text-gray-500 flex items-center'>
					<House className='w-3.5 h-3.5 mr-1 text-gray-400' />
					Convenient Time: <span className='font-medium text-gray-700 ml-1'>{complaint.convenientTime}</span>
				</p>
			</div>

			{/* Body */}
			<div className='p-5'>
				<div className='grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 mb-5'>
					<div className='flex items-center text-gray-700'>
						<Phone className='w-3 h-3 mr-1 text-blue-500 ' />
						<span className='font-medium text-sm mr-1'>Phone:</span>
						<span className='text-sm'>{complaint.customerPhone}</span>
					</div>
				</div>

				<div className='mb-5 text-gray-700 leading-relaxed'>
					<p className='font-semibold text-gray-800 mb-2 flex items-center text-sm'>
						<CornerDownRight className='w-4 h-4 mr-2 text-purple-500' />
						Description:
					</p>
					<p className='whitespace-pre-wrap text-sm'>
						{displayDescription}
						{complaint.description.length > maxDescriptionLength && (
							<button onClick={toggleDescription} className='text-blue-600 hover:text-blue-800 font-medium ml-1 inline-flex items-center text-xs'>
								{showFullDescription ? "Read Less" : "Read More"}
							</button>
						)}
					</p>
				</div>

				{complaint.imagePaths && complaint.imagePaths.length > 0 && (
					<div className='mb-5'>
						<p className='font-semibold text-gray-800 mb-3 flex items-center text-sm'>
							<ImageIcon className='w-3 h-3 mr-1 text-orange-500' />
							Attached Images:
						</p>
						<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-3xl'>
							{complaint.imagePaths.map((path, index) => (
								<div key={index} className='relative w-full h-24 rounded-md overflow-hidden bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center'>
									<Link href={path} target='_blank' rel='noopener noreferrer'>
										<img src={path} alt={`Complaint Image ${index + 1}`} sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw' style={{ objectFit: "cover" }} className='transition-transform duration-200 hover:scale-105' />
									</Link>
								</div>
							))}
						</div>
					</div>
				)}
				{complaint.imagePaths && complaint.imagePaths.length === 0 && (
					<div className='mb-5 text-gray-500 flex items-center justify-center py-3 border rounded-md bg-gray-50 text-sm'>
						<XCircle className='w-4 h-4 mr-2' /> No images attached for this complaint.
					</div>
				)}
			</div>

			{/* Work times section */}
			<div className='px-5 pb-5'>
				{complaint.workTimes && complaint.workTimes.endTime !== "null" && (
					<div className='bg-green-50 border border-green-200 rounded-md p-4 mb-4'>
						<div className='text-green-700 font-semibold flex items-center mb-2'>
							<Calendar className='w-4 h-4 mr-2 text-green-500' />
							Work Completed: {complaint.workTimes.user.fullName} ({complaint.workTimes.user.role}) Signature: {complaint.workTimes.workerInitials} / {complaint.workTimes.customerInitials}
						</div>
						<div className='text-sm text-gray-700 mb-1'>
							<span className='font-medium'>Date:</span> <span>{complaint.workTimes.date}</span>
						</div>
						<div className='text-sm text-gray-700 mb-1'>
							<span className='font-medium'>Start Time:</span> <span>{complaint.workTimes.startTime}</span>
						</div>
						<div className='text-sm text-gray-700'>
							<span className='font-medium'>End Time:</span> <span>{complaint.workTimes.endTime}</span>
						</div>
					</div>
				)}

				{!complaint.workTimes && (
					<div className='bg-blue-50 border border-blue-200 rounded-md p-4 mb-4'>
						<form
							onSubmit={async (event) => {
								event.preventDefault();
								setIsWorkTimesLoading(true);
								const formData = new FormData(event.currentTarget as HTMLFormElement);
								const result = await addStartWorkTime(formData);
								if (result.success) {
									window.location.reload();
								} else {
									alert(result.message);
								}
							}}>
							<input type='hidden' name='complaintId' value={complaint.id} />
							<Button type='submit' className='w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition' disabled={isWorkTimesLoading}>
								<Calendar className='w-4 h-4' />
								Start Work
								{isWorkTimesLoading && <Loading />}
							</Button>
						</form>
					</div>
				)}

				{complaint.workTimes && complaint.workTimes.startTime && complaint.workTimes.endTime === "null" && (
					<div className='bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4'>
						<div className='text-yellow-700 font-semibold flex items-center mb-2'>
							<Calendar className='w-4 h-4 mr-2 text-yellow-500' />
							Work In Progress: {complaint.workTimes.user.fullName} ({complaint.workTimes.user.role})
						</div>
						<div className='text-sm text-gray-700 mb-1'>
							<span className='font-medium'>Date:</span> <span>{complaint.workTimes.date}</span>
						</div>
						<div className='text-sm text-gray-700 mb-3'>
							<span className='font-medium'>Start Time:</span> <span>{complaint.workTimes.startTime}</span>
						</div>

						{/* NEW: End Work flow via dialog */}
						<Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
							<DialogTrigger asChild>
								<Button className='w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 rounded-md transition' onClick={() => setIsEndDialogOpen(true)} disabled={isWorkTimesLoading}>
									<Calendar className='w-4 h-4' />
									End Work
									{isWorkTimesLoading && <Loading />}
								</Button>
							</DialogTrigger>

							<DialogContent>
								<DialogHeader>
									<DialogTitle>Confirm work completion</DialogTitle>
									<DialogDescription className='text-xs'>Please enter initials before completing. This is just a UI step; the initials aren’t stored yet.</DialogDescription>
								</DialogHeader>

								<div className='space-y-4 mt-2'>
									<div className='grid gap-2'>
										<Label htmlFor='worker-initials'>Worker initials</Label>
										<Input id='worker-initials' placeholder='e.g., SA' value={workerInitials} onChange={(e) => setWorkerInitials(e.target.value)} maxLength={6} />
									</div>

									<div className='grid gap-2'>
										<Label htmlFor='customer-initials'>Customer initials</Label>
										<Input id='customer-initials' placeholder='e.g., MK' value={customerInitials} onChange={(e) => setCustomerInitials(e.target.value)} maxLength={6} />
									</div>

									{endError && <p className='text-xs text-red-600 border border-red-200 bg-red-50 rounded px-2 py-1'>{endError}</p>}
								</div>

								<DialogFooter className='mt-4'>
									<Button
										variant='outline'
										onClick={() => {
											setIsEndDialogOpen(false);
											setEndError(null);
										}}
										disabled={isWorkTimesLoading}>
										Cancel
									</Button>
									<Button className='text-white' onClick={handleConfirmEndWork} disabled={isWorkTimesLoading || !workerInitials.trim() || !customerInitials.trim()}>
										{isWorkTimesLoading ? (
											<span className='inline-flex items-center gap-2'>
												<Loading /> Finishing…
											</span>
										) : (
											"Confirm & End Work"
										)}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				)}
			</div>

			{/* Past Responses */}
			<div className='p-5 pt-0 border-t border-gray-100 bg-white'>
				<h4 className='text-base font-semibold text-gray-800 mb-3 flex items-center'>
					<MessageSquare className='w-3 h-3 mr-1 text-indigo-500' /> Past Responses ({complaint.responses.length})
				</h4>
				{complaint.responses.length > 0 ? (
					<div className='space-y-3'>
						{complaint.responses.map((response) => {
							if (response.response)
								return (
									<div key={response.id} className='bg-gray-50 p-3 rounded-md border border-gray-200 shadow-sm'>
										<div className='flex items-center justify-between text-xs text-gray-600 mb-1.5'>
											<span className='flex items-center font-medium text-gray-700'>
												<User className='w-3.5 h-3.5 mr-1 text-gray-500' />
												{response.responder.fullName} ({response.responder.role})
											</span>
											<span className='text-xs text-gray-500'>{response.createdAt}</span>
										</div>
										<p className='text-gray-700 leading-relaxed text-sm whitespace-pre-wrap'>{response.response}</p>
										<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-3xl'>
											{response.imagePaths.map((path, index) => (
												<div key={index} className='relative w-full h-24 rounded-md overflow-hidden bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center'>
													<Link href={path} target='_blank' rel='noopener noreferrer'>
														<img src={path} alt={`Complaint Image ${index + 1}`} sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw' style={{ objectFit: "cover" }} className='transition-transform duration-200 hover:scale-105' />
													</Link>
												</div>
											))}
										</div>
									</div>
								);
						})}
					</div>
				) : (
					<div className='text-gray-500 text-center py-3 border rounded-md bg-white text-sm'>No responses yet.</div>
				)}
			</div>

			{/* Response form + PDF */}
			<div className='bg-gray-50 border-t border-gray-100 p-5'>
				<ComplaintResponseForm complaintId={complaint.id} />
				<Button
					className='mt-4 text-sm text-white w-full hover:cursor-pointer'
					onClick={async () => {
						const { base64, fileName } = await generateComplaintPdfById(complaint.id);
						const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
						const blob = new Blob([byteArray], { type: "application/pdf" });
						const url = URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.href = url;
						a.download = fileName;
						a.click();
						URL.revokeObjectURL(url);
					}}>
					<Download className='w-4 h-4 mr-2' />
					Download PDF
				</Button>
			</div>

			{/* Footer */}
			<div className='p-3 text-right text-xs text-gray-500 bg-gray-50 mt-auto'>
				<p className='flex items-center justify-end'>
					<Calendar className='w-3.5 h-3.5 mr-1 text-gray-400' />
					Filed: {complaint.createdAt}
				</p>
			</div>
		</div>
	);
};

export default ComplaintCard;
