import React from "react";
import CustomInventoryDataTable from "./inventory-data-table";
import prismaClient from "@/lib/prisma";

async function InventoryTable({ role = "inventory_manager" }: { role?: string }) {
	const data = await prismaClient.inventory.findMany({
		orderBy: {
			createdAt: "desc",
		},
	});

	const formattedData = data.map((item) => ({
		id: String(item.id),
		itemName: item.itemName,
		itemCode: item.itemCode || "-",
		category: item.category || "-",
		description: item.description || "-",
		quantity: item.quantity,
		unitPrice: item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : "-",
		supplier: item.supplier || "-",
		location: item.location || "-",
		division: item.division === "DUBAI" ? "Dubai" : "Sharjah",
		imageUrl: item.imageUrl || "-",
		createdAt: item.createdAt.toDateString(),
		updatedAt: item.updatedAt.toDateString(),
	}));

	return <CustomInventoryDataTable data={formattedData} role={role} />;
}

export default InventoryTable;
