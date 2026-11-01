// Field rules for creating / editing an inventory item. Every field is
// mandatory (client request) — shared by AddInventoryForm and the server
// actions so the browser and the server can never disagree.
import { z } from "zod";
import { isValidQtyForUnit } from "./inventory-units";

const requiredText = (message: string, max = 100) => z.string({ required_error: message }).trim().min(1, { message }).max(max, { message: `Must be at most ${max} characters long` });

export const INVENTORY_ITEM_MESSAGES = {
	photoRequired: "An item photo is required.",
	unitPriceRequired: "Unit price is required",
	unitPricePositive: "Unit price must be greater than 0",
};

export const inventoryItemFields = {
	itemName: z.string({ required_error: "Item name is required" }).trim().min(2, { message: "Item name must be at least 2 characters long" }).max(100, { message: "Item name must be at most 100 characters long" }),
	itemCode: requiredText("Item code is required"),
	category: requiredText("Category is required"),
	description: requiredText("Description is required", 1000),
	quantity: z.preprocess(
		(v) => (v === "" || v === null || v === undefined ? undefined : v),
		z.coerce.number({ required_error: "Quantity is required", invalid_type_error: "Quantity is required" }).min(0, { message: "Quantity must be at least 0" })
	),
	unit: z.enum(["PIECES", "METERS"], { required_error: "Unit is required" }),
	// "" from an empty input must not coerce to 0 — treat it as missing
	unitPrice: z.preprocess(
		(v) => (v === "" || v === null || v === undefined ? undefined : v),
		z.coerce.number({ required_error: INVENTORY_ITEM_MESSAGES.unitPriceRequired, invalid_type_error: INVENTORY_ITEM_MESSAGES.unitPriceRequired }).positive({ message: INVENTORY_ITEM_MESSAGES.unitPricePositive })
	),
	supplier: requiredText("Supplier is required"),
	location: requiredText("Location is required"),
	division: z.enum(["DUBAI", "SHARJAH"], { required_error: "Division is required" }),
};

export const pieceQuantityCheck = (data: { unit: string; quantity: number }, ctx: z.RefinementCtx) => {
	if (!isValidQtyForUnit(data.quantity, data.unit)) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Quantity must be a whole number for items counted in pieces" });
	}
};

export const inventoryItemSchema = z.object(inventoryItemFields).superRefine(pieceQuantityCheck);

export const INVENTORY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
export const MAX_INVENTORY_IMAGE_BYTES = 5 * 1024 * 1024;
