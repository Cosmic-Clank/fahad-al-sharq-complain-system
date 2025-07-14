// components/ComplaintForm.tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
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

// IMPORTANT: This Zod schema should match the one in your server action for client-side validation
const formSchema = z.object({
	fullname: z.string({ required_error: "Full name is required" }).min(2, { message: "Full name must be at least 2 characters long" }).max(50, { message: "Full name must be at most 50 characters long" }),
	email: z.string({ required_error: "Email is required" }).email({ message: "Enter a valid email address" }),
	phoneNumber: z.string({ required_error: "Phone number is required" }).min(5, { message: "Phone number must be at least 5 characters long" }).max(15, { message: "Phone number must be at most 15 characters long" }),
	address: z.string({ required_error: "Address is required" }).min(5, { message: "Address must be at least 5 characters long" }).max(100, { message: "Address must be at most 100 characters long" }),
	buildingName: z.string({ required_error: "Building name is required" }).min(1, { message: "Building name must be at least 1 character long" }).max(20, { message: "Building name must be at most 20 characters long" }),
	branchArea: z.string({ required_error: "Branch area is required" }).refine((val) => ["Al Nuaimia 1 - Ajman", "Al Jerf - Ajman", "Taawun - Sharjah", "Al Nahda - Sharjah", "Al Khan - Sharjah", "Al Majaz 1 - Sharjah", "Al Majaz 2 - Sharjah", "Abu Shagara - Sharjah", "Al Qasimia - Sharjah", "Muwaileh - Sharjah", "Industrial 15 - Sharjah", "Al Nahda - Dubai", "Al Qusais - Dubai", "Al Garhoud - Dubai", "Warsan - Dubai", "Silicon - Dubai", "Ras al Khor - Dubai", "Al Barsha - Dubai", "DIP - Dubai", "DIC - Dubai"].includes(val), {
		message: "Please select a valid branch area",
	}),
	description: z.string({ required_error: "Description is required" }).min(10, { message: "Description must be at least 10 characters long" }).max(500, { message: "Description must be at most 500 characters long" }),
});

function ComplaintForm() {
	const [images, setImages] = React.useState<File[]>([]);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [submitError, setSubmitError] = React.useState<string | null>(null);
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			fullname: "",
			email: "",
			phoneNumber: "",
			address: "",
			buildingName: "",
			branchArea: "",
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
		formData.append("email", values.email);
		formData.append("phoneNumber", values.phoneNumber);
		formData.append("address", values.address);
		formData.append("buildingName", values.buildingName);
		formData.append("branchArea", values.branchArea);
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
							<FormLabel>Email</FormLabel>
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
				{/* Bill Number */}
				<FormField
					control={form.control}
					name='buildingName' // This name must match the schema and formData key
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Building Name</FormLabel>
							<FormControl>
								<Input placeholder='Enter the building name' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{/* Branch Area */}
				<FormField
					control={form.control}
					name='branchArea' // This name must match the schema and formData key
					render={({ field }) => (
						<FormItem className='p-6 bg-white rounded-sm border-l-4 focus-within:border-primary'>
							<FormLabel>Branch Area</FormLabel>

							<Select onValueChange={field.onChange} defaultValue={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select an area' />
									</SelectTrigger>
								</FormControl>

								<SelectContent>
									<SelectGroup>
										<SelectLabel>Ajman</SelectLabel>
										<SelectItem value='Al Nuaimia 1 - Ajman'>Al Nuaimia 1</SelectItem>
										<SelectItem value='Al Jerf - Ajman'>Al Jerf</SelectItem>
									</SelectGroup>
									<SelectGroup>
										<SelectLabel>Sharjah</SelectLabel>
										<SelectItem value='Taawun - Sharjah'>Taawun</SelectItem>
										<SelectItem value='Al Nahda - Sharjah'>Al Nahda</SelectItem>
										<SelectItem value='Al Khan - Sharjah'>Al Khan</SelectItem>
										<SelectItem value='Al Majaz 1 - Sharjah'>Al Majaz 1</SelectItem>
										<SelectItem value='Al Majaz 2 - Sharjah'>Al Majaz 2</SelectItem>
										<SelectItem value='Abu Shagara - Sharjah'>Abu Shagara</SelectItem>
										<SelectItem value='Al Qasimia - Sharjah'>Al Qasimia</SelectItem>
										<SelectItem value='Muwaileh - Sharjah'>Muwaileh</SelectItem>
										<SelectItem value='Industrial 15 - Sharjah'>Industrial 15</SelectItem>
									</SelectGroup>
									<SelectGroup>
										<SelectLabel>Dubai</SelectLabel>
										<SelectItem value='Al Nahda - Dubai'>Al Nahda</SelectItem>
										<SelectItem value='Al Qusais - Dubai'>Al Qusais</SelectItem>
										<SelectItem value='Al Garhoud - Dubai'>Al Garhoud</SelectItem>
										<SelectItem value='Warsan - Dubai'>Warsan</SelectItem>
										<SelectItem value='Silicon - Dubai'>Silicon</SelectItem>
										<SelectItem value='Ras al Khor - Dubai'>Ras al Khor</SelectItem>
										<SelectItem value='Al Barsha - Dubai'>Al Barsha</SelectItem>
										<SelectItem value='DIP - Dubai'>DIP</SelectItem>
										<SelectItem value='DIC - Dubai'>DIC</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
							<FormDescription>Please select the branch area where you would like to submit your complaint.</FormDescription>
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
