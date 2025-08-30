import { z } from "zod";

export const formSchema = z.object({
	fullname: z.string({ required_error: "Full name is required" }).min(2, { message: "Full name must be at least 2 characters long" }).max(50, { message: "Full name must be at most 50 characters long" }),
	email: z.string().email({ message: "Enter a valid email address" }).optional().or(z.literal("")),
	phoneNumber: z.string({ required_error: "Phone number is required" }).min(5, { message: "Phone number must be at least 5 characters long" }).max(15, { message: "Phone number must be at most 15 characters long" }),
	address: z.string({ required_error: "Address is required" }).min(5, { message: "Address must be at least 5 characters long" }).max(100, { message: "Address must be at most 100 characters long" }),
	buildingName: z.string({ required_error: "Building name is required" }),
	apartmentNumber: z.string({ required_error: "Appartment Number is required" }).min(1, { message: "Minimum 1 character" }), // Optional field for apartment number
	convenientTime: z.enum(["EIGHT_AM_TO_TEN_AM", "TEN_AM_TO_TWELVE_PM", "TWELVE_PM_TO_TWO_PM", "TWO_PM_TO_FOUR_PM", "FOUR_PM_TO_SIX_PM", "SIX_PM_TO_EIGHT_PM", "EIGHT_PM_TO_TEN_PM", "TEN_PM_TO_TWELVE_AM", "TWELVE_AM_TO_TWO_AM", "TWO_AM_TO_FOUR_AM", "FOUR_AM_TO_SIX_AM", "SIX_AM_TO_EIGHT_AM"], {
		required_error: "Convenient time is required",
	}),
	branchArea: z.string({ required_error: "Branch area is required" }).refine((val) => ["Al Nuaimia 1 - Ajman", "Al Jerf - Ajman", "Taawun - Sharjah", "Al Nahda - Sharjah", "Al Khan - Sharjah", "Al Majaz 1 - Sharjah", "Al Majaz 2 - Sharjah", "Abu Shagara - Sharjah", "Al Qasimia - Sharjah", "Muwaileh - Sharjah", "Industrial 15 - Sharjah", "Al Nahda - Dubai", "Al Qusais - Dubai", "Al Garhoud - Dubai", "Warsan - Dubai", "Silicon - Dubai", "Ras al Khor - Dubai", "Al Barsha - Dubai", "DIP - Dubai", "DIC - Dubai"].includes(val), {
		message: "Please select a valid branch area",
	}),
	description: z.string({ required_error: "Description is required" }).min(10, { message: "Description must be at least 10 characters long" }).max(500, { message: "Description must be at most 500 characters long" }),
});
