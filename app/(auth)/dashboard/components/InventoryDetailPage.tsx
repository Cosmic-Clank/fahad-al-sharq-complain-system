import React from "react";
import { notFound } from "next/navigation";
import prismaClient from "@/lib/prisma";
import InventoryItemCard from "./InventoryItemCard";

interface InventoryDetailPageProps {
	id: string;
	role?: string;
}

async function InventoryDetailPage({ id, role = "inventory_manager" }: InventoryDetailPageProps) {
	const itemId = Number(id);

	// Fetch the inventory item with its transactions
	const item = await prismaClient.inventory.findUnique({
		where: {
			id: itemId,
		},
		include: {
			transactions: {
				orderBy: {
					createdAt: "desc",
				},
			},
		},
	});

	// Handle case where item is not found
	if (!item) {
		notFound();
	}

	// Format the data for the client component
	const formattedItem = {
		id: String(item.id),
		itemName: item.itemName,
		itemCode: item.itemCode || "",
		category: item.category || "",
		description: item.description || "",
		quantity: item.quantity,
		unitPrice: item.unitPrice || null,
		supplier: item.supplier || "",
		location: item.location || "",
		division: item.division,
		imageUrl: item.imageUrl || null,
		createdAt: item.createdAt.toLocaleString(),
		updatedAt: item.updatedAt.toLocaleString(),
		transactions: item.transactions.map((txn) => ({
			id: String(txn.id),
			quantity: txn.quantity,
			transactionType: txn.transactionType,
			notes: txn.notes || "",
			createdAt: txn.createdAt.toLocaleString(),
		})),
	};

	return <InventoryItemCard item={formattedItem} role={role} />;
}

export default InventoryDetailPage;
