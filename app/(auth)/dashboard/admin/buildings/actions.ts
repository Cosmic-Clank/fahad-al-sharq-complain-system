// components/buildings/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function createBuilding(formData: FormData) {
	const buildingName = String(formData.get("buildingName") || "").trim();
	const emirate = String(formData.get("emirate") || "").trim();

	if (!buildingName) throw new Error("Building name is required.");
	if (!emirate) throw new Error("Emirate is required.");

	await prisma.buildings.create({
		data: { id: Number(randomUUID().replace(/\D/g, "").slice(0, 8)), buildingName, emirate },
	});

	revalidatePath("/buildings");
}

export async function deleteBuilding(formData: FormData) {
	const id = String(formData.get("id") || "").trim();
	if (!id) throw new Error("Missing building id.");

	await prisma.buildings.delete({
		where: { id: Number(id) },
	});

	revalidatePath("/buildings");
}
