// components/ComplaintForm.tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BuildingsCombobox } from "../../../components/BuildingsCombobox";
import { formSchema } from "@/lib/constants";

// IMPORTANT: This Zod schema should match the one in your server action for client-side validation

function ComplaintForm() {
	const [images, setImages] = React.useState<File[]>([]);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [submitError, setSubmitError] = React.useState<string | null>(null);
	const [buildings, setBuildings] = React.useState<string[]>([]);
	const router = useRouter();

	useEffect(() => {
		// Fetch building names from the server or any other source
		const fetchBuildings = async () => {
			try {
				const response = await fetch("/api/buildings");
				const data = await response.json();
				setBuildings(Array.isArray(data) ? data.map((item) => item.buildingName) : []);
			} catch (error) {
				console.error("Error fetching buildings:", error);
			}
		};

		fetchBuildings();
	}, []);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			fullname: "",
			email: "",
			phoneNumber: "",
			address: "",
			buildingName: "",
			apartmentNumber: "",
			convenientTime: "EIGHT_AM_TO_TEN_AM", // Default value for convenient time
			description: "",
		},
	});

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const selectedFiles = Array.from(e.target.files);
			const maxImages = 5;
			const maxSize = 2 * 1024 * 1024;
			const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

			if (selectedFiles.length > maxImages) {
				setSubmitError(`You can upload a maximum of ${maxImages} images.`);
				e.target.value = ""; // Clear the input
				return;
			}

			const invalidFiles = selectedFiles.filter((file) => file.size > maxSize || !allowedTypes.includes(file.type));
			if (invalidFiles.length > 0) {
				setSubmitError(`Some files are invalid: Max size is 2MB, supported types are ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}.`);
				e.target.value = ""; // Clear the input
				return;
			}
			setImages(selectedFiles);
		}
	};

	// THIS IS THE UPDATED ONSUBMIT FUNCTION
	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		setIsSubmitting(true);
		setSubmitError(null); // Clear previous errors

		const formData = new FormData();

		// Append all text fields from the validated `values` object
		// The keys here (fullname, email, etc.) must match the names expected
		// by `formData.get()` in your Server Action.
		formData.append("fullname", values.fullname);
		formData.append("email", values.email || ""); // Handle optional email
		formData.append("phoneNumber", values.phoneNumber);
		formData.append("address", values.address);
		formData.append("buildingName", values.buildingName);
		formData.append("apartmentNumber", values.apartmentNumber);
		formData.append("convenientTime", values.convenientTime);
		formData.append("description", values.description);

		// Append image files to the FormData object
		// The 'images' key here must match formData.getAll('images') in your Server Action
		images.forEach((file) => {
			formData.append("images", file);
		});

		try {
			// Call your server action directly with the FormData object
			const res = await fetch("/api/complaints", {
				method: "POST",
				body: formData,
			});
			const data = await res.json();
			// Handle potential errors or messages returned from the server action
			if (!res.ok) {
				throw new Error(data.message || "Something went wrong");
			}
			if (res.ok) {
				router.push("/success"); // Redirect to a success page
			}
		} catch (err) {
			console.error("Error submitting complaint:", err);
			setSubmitError("Failed to submit complaint. Please try again.");
		} finally {
			setIsSubmitting(false);
			setImages([]); // Clear images after submission
			form.reset(); // Reset the form fields
		}
	};

	if (buildings.length === 0) {
		<div className='w-full h-screen flex justify-center items-center'>
			<svg className='animate-spin h-10 w-10 text-primary' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
				<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
				<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'></path>
			</svg>
		</div>;
	}

	return (
		<Form {...form}>
			{/* The form's onSubmit handler orchestrates client-side validation
                and then calls the Server Action */}
			<form onSubmit={form.handleSubmit(onSubmit)} className='max-w-2xl mx-auto space-y-3 p-4'>
				<div className='p-6 bg-white rounded-sm border-t-4 border-primary '>
					<h2 className='text-2xl font-bold mb-4'>Complaint Form</h2>
					<p className='text-gray-600 mb-4'>Please fill out the form below to submit your complaint.</p>
				</div>
				{/* Full Name */}
				<FormField
					control={form.control}
					name='fullname' // This name must match the schema and formData key
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Full Name</FormLabel>
							<FormControl>
								<Input placeholder='Enter your full name' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{/* Email */}
				<FormField
					control={form.control}
					name='email' // This name must match the schema and formData key
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Email (optional)</FormLabel>
							<FormControl>
								<Input placeholder='Enter your email' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Phone Number */}
				<FormField
					control={form.control}
					name='phoneNumber' // This name must match the schema and formData key
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Phone Number</FormLabel>
							<FormControl>
								<Input placeholder='Enter your phone number' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{/* Address */}
				<FormField
					control={form.control}
					name='address' // This name must match the schema and formData key
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Address</FormLabel>
							<FormControl>
								<Input placeholder='Enter your address' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{/* Building Name */}
				<FormField
					control={form.control}
					name='buildingName' // This name must match the schema and formData key
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Building Name</FormLabel>
							<FormControl>
								<BuildingsCombobox options={buildings.map((b) => ({ value: b, label: b }))} value={field.value} onChange={field.onChange} placeholder='Select Building' />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{/* Apartment Number */}
				<FormField
					control={form.control}
					name='apartmentNumber' // This name must match the schema and formData key
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Apartment Number</FormLabel>
							<FormControl>
								<Input placeholder='Enter your apartment number' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{/* Convenient Time */}
				<FormField
					control={form.control}
					name='convenientTime' // This name must match the schema and formData key
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Convenient Time</FormLabel>

							<Select onValueChange={field.onChange} defaultValue={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select a convenient time' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectGroup>
										<SelectItem value='EIGHT_AM_TO_TEN_AM'>8 AM to 10 AM</SelectItem>
										<SelectItem value='TEN_AM_TO_TWELVE_PM'>10 AM to 12 PM</SelectItem>
										<SelectItem value='TWELVE_PM_TO_TWO_PM'>12 PM to 2 PM</SelectItem>
										<SelectItem value='TWO_PM_TO_FOUR_PM'>2 PM to 4 PM</SelectItem>
										<SelectItem value='FOUR_PM_TO_SIX_PM'>4 PM to 6 PM</SelectItem>
										<SelectItem value='SIX_PM_TO_EIGHT_PM'>6 PM to 8 PM</SelectItem>
										<SelectItem value='EIGHT_PM_TO_TEN_PM'>8 PM to 10 PM</SelectItem>
										<SelectItem value='TEN_PM_TO_TWELVE_AM'>10 PM to 12 AM</SelectItem>
										<SelectItem value='TWELVE_AM_TO_TWO_AM'>12 AM to 2 AM</SelectItem>
										<SelectItem value='TWO_AM_TO_FOUR_AM'>2 AM to 4 AM</SelectItem>
										<SelectItem value='FOUR_AM_TO_SIX_AM'>4 AM to 6 AM</SelectItem>
										<SelectItem value='SIX_AM_TO_EIGHT_AM'>6 AM to 8 AM</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
				{/* Description */}
				<FormField
					control={form.control}
					name='description' // This name must match the schema and formData key
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea placeholder='Enter your description' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{/* Image Upload */}
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

				{submitError && <p className='text-red-500 text-sm mt-2'>{submitError}</p>}

				<Button type='submit' className='w-full hover:cursor-pointer' disabled={isSubmitting}>
					{isSubmitting ? "Submitting..." : "Submit Complaint"}
				</Button>
			</form>
		</Form>
	);
}

export default ComplaintForm;
