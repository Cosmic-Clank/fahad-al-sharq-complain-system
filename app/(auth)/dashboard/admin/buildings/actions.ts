// app/buildings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function createBuilding(formData: FormData) {
	const name = (formData.get("buildingName") || "").toString().trim();
	if (!name) throw new Error("Building name is required.");

	const id = Math.floor(Math.random() * 1_000_000_000); // Generates a random unique id
	await prisma.buildings.create({
		data: { id, buildingName: name },
	});

	revalidatePath("/buildings");
}

export async function deleteBuilding(formData: FormData) {
	const idRaw = formData.get("id");
	if (!idRaw) throw new Error("Missing building id.");

	// If your id is numeric in your Prisma schema, coerce:
	// await prisma.buildings.delete({ where: { id: Number(idRaw) } });
	await prisma.buildings.delete({ where: { id: Number(idRaw) } });

	revalidatePath("/buildings");
}
