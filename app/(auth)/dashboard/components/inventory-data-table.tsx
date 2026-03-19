"use client";

import * as React from "react";
import DataTable from "react-data-table-component";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

type InventoryRowData = {
	id: string;
	itemName: string;
	itemCode: string;
	category: string;
	description: string;
	quantity: number;
	unitPrice: string;
	supplier: string;
	location: string;
	division: string;
	imageUrl: string;
	createdAt: string;
	updatedAt: string;
};

export default function CustomInventoryDataTable({ data, role = "inventory_manager" }: { data: InventoryRowData[]; role?: string }) {
	const router = useRouter();

	const handleRowClick = (row: InventoryRowData) => {
		router.push(`/dashboard/${role}/item/${row.id}`);
	};

	const handleRestockClick = (e: React.MouseEvent, itemId: string) => {
		e.stopPropagation(); // Prevent row click
		router.push(`/dashboard/${role}/restock/${itemId}`);
	};

	const columns = [
		{ name: "ID", selector: (row: InventoryRowData) => row.id, sortable: true, grow: 0, width: "60px" },
		{ name: "Item Name", selector: (row: InventoryRowData) => row.itemName, sortable: true },
		{
			name: "Image",
			cell: (row: InventoryRowData) => (
				row.imageUrl !== "-" ? (
					<Image src={row.imageUrl} alt={row.itemName} width={40} height={40} className='rounded object-cover' />
				) : (
					<span className='text-gray-400'>No image</span>
				)
			),
			width: "60px",
		},
		{ name: "Item Code", selector: (row: InventoryRowData) => row.itemCode, sortable: true },
		{ name: "Category", selector: (row: InventoryRowData) => row.category, sortable: true },
		{
			name: "Description",
			wrap: true,
			selector: (row: InventoryRowData) => row.description,
			format: (row: InventoryRowData) => {
				const maxLength = 50;
				return row.description.length > maxLength ? `${row.description.substring(0, maxLength)}...` : row.description;
			},
			sortable: true,
		},
		{ name: "Quantity", selector: (row: InventoryRowData) => row.quantity, sortable: true },
		{ name: "Unit Price", selector: (row: InventoryRowData) => row.unitPrice, sortable: true },
		{ name: "Supplier", selector: (row: InventoryRowData) => row.supplier, sortable: true },
		{ name: "Location", selector: (row: InventoryRowData) => row.location, sortable: true },
		{ name: "Division", selector: (row: InventoryRowData) => row.division, sortable: true },
		{ name: "Created At", selector: (row: InventoryRowData) => row.createdAt, sortable: true },
		{ name: "Updated At", selector: (row: InventoryRowData) => row.updatedAt, sortable: true },
		{
			name: "Actions",
			cell: (row: InventoryRowData) => (
				<Button
					size="sm"
					variant="outline"
					onClick={(e) => handleRestockClick(e, row.id)}
					className="flex items-center gap-1"
				>
					<Plus className="h-3 w-3" />
					Restock
				</Button>
			),
			width: "120px",
		},
	];

	const customStyles = {
		headCells: {
			style: {
				paddingLeft: "8px",
				paddingRight: "8px",
				backgroundColor: "#f3f4f6",
				color: "#1f2937",
				fontSize: "0.875rem",
				fontWeight: "600",
			},
		},
		cells: {
			style: {
				paddingLeft: "8px",
				paddingRight: "8px",
			},
		},
	};

	return (
		<div className='p-4'>
			<DataTable columns={columns} data={data} pagination highlightOnHover pointerOnHover customStyles={customStyles} onRowClicked={handleRowClick} />
		</div>
	);
}
