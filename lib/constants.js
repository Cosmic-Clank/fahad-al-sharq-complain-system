import { z } from "zod";

export const formSchema = z.object({
	fullname: z.string({ required_error: "Full name is required" }).min(2, { message: "Full name must be at least 2 characters long" }).max(50, { message: "Full name must be at most 50 characters long" }),
	email: z.string().email({ message: "Enter a valid email address" }).optional().or(z.literal("")),
	phoneNumber: z
		.string({ required_error: "Phone number is required" })
		.trim()
		.regex(/^(?:\+971|00971|0)?5\d{8}$/, {
			message: "Enter a valid UAE mobile (e.g., 0501234567 or +971501234567)",
		}),

	address: z.string({ required_error: "Address is required" }).min(5, { message: "Address must be at least 5 characters long" }).max(100, { message: "Address must be at most 100 characters long" }),
	buildingName: z.string({ required_error: "Building name is required" }),
	apartmentNumber: z.string({ required_error: "Appartment Number is required" }).min(1, { message: "Minimum 1 character" }), // Optional field for apartment number
	convenientTime: z.enum(["EIGHT_AM_TO_TEN_AM", "TEN_AM_TO_TWELVE_PM", "TWELVE_PM_TO_TWO_PM", "TWO_PM_TO_FOUR_PM", "FOUR_PM_TO_SIX_PM", "SIX_PM_TO_EIGHT_PM", "EIGHT_PM_TO_TEN_PM", "TEN_PM_TO_TWELVE_AM", "TWELVE_AM_TO_TWO_AM", "TWO_AM_TO_FOUR_AM", "FOUR_AM_TO_SIX_AM", "SIX_AM_TO_EIGHT_AM"], {
		required_error: "Convenient time is required",
	}),
	description: z.string().optional(),
});
