// components/CustomDataTable.tsx
"use client";

import { SortDescIcon } from "lucide-react";
import DataTable from "react-data-table-component";
import React, { useState } from "react"; // Added useState
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading"; // Import the loading component
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { deleteEmployees } from "../actions"; // Import the delete action

type RowData = {
	id: string;
	fullName: string;
	email: string;
	createdAt: string; // ISO string from DB
};

// Define the columns for your data table
const columns = [
	{
		name: "ID",
		selector: (row: RowData) => row.id,
		sortable: true,
		grow: 0.5, // Adjust column width if necessary
	},
	{
		name: "Full Name",
		selector: (row: RowData) => row.fullName,
		sortable: true,
		grow: 1.5,
	},
	{
		name: "Email",
		selector: (row: RowData) => row.email,
		sortable: true,
		grow: 2,
	},
	{
		name: "Created At",
		selector: (row: RowData) => new Date(row.createdAt).toLocaleString(), // Format date for display
		sortable: true,
		grow: 1.5,
	},
];

// Prop interface for CustomDataTable
interface CustomDataTableProps {
	data: RowData[];
}

function CustomDataTable({ data }: CustomDataTableProps) {
	const [selectedRows, setSelectedRows] = useState<RowData[]>([]);
	const [isDeleting, setIsDeleting] = useState(false); // State for delete button loading
	const [deleteMessage, setDeleteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	// Handler for row selection changes
	function handleRowSelected(selected: { allSelected: boolean; selectedCount: number; selectedRows: RowData[] }) {
		setSelectedRows(selected.selectedRows);
		setDeleteMessage(null); // Clear messages when selection changes
	}

	// Handler for the "Continue" button in the AlertDialog
	const handleDeleteConfirm = async () => {
		setIsDeleting(true);
		setDeleteMessage(null); // Clear previous messages

		const idsToDelete = selectedRows.map((row) => row.id);

		try {
			const result = await deleteEmployees(idsToDelete); // Call the server action

			if (result.success) {
				setDeleteMessage({ type: "success", text: result.message });
				setSelectedRows([]); // Clear selection after successful deletion
				// Note: The `revalidatePath` in the server action will handle data refresh.
			} else {
				setDeleteMessage({ type: "error", text: result.message });
			}
		} catch (error) {
			console.error("Client-side error during deletion:", error);
			setDeleteMessage({ type: "error", text: "An unexpected error occurred during deletion." });
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className=''>
			<DataTable
				columns={columns}
				data={data}
				pagination // Enable pagination
				sortIcon={<SortDescIcon className='w-4 h-4 ml-1' />} // Smaller sort icon
				striped
				highlightOnHover
				pointerOnHover
				selectableRows // Enable row selection
				onSelectedRowsChange={handleRowSelected}
				className='rounded-lg overflow-hidden' // Apply some styling to the table container
			/>

			{deleteMessage && <div className={`mt-4 p-3 rounded-md text-sm ${deleteMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{deleteMessage.text}</div>}

			<div className='flex flex-wrap justify-end p-4 gap-3'>
				{" "}
				{/* Adjust gap and add border-top */}
				<Button
					className='min-w-[100px] bg-green-500 hover:bg-green-400 hover:cursor-pointer' // Professional styling
					onClick={() => (window.location.href = "/dashboard/admin/employees/create")} // Changed to 'new' for consistency
				>
					Create New
				</Button>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							className='min-w-[100px] bg-red-500 hover:bg-red-400 hover:cursor-pointer' // Professional styling
							disabled={selectedRows.length === 0 || isDeleting} // Disable if no rows selected or if currently deleting
						>
							{isDeleting ? "Deleting..." : "Delete Selected"}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
							<AlertDialogDescription>This action cannot be undone. This will permanently delete the selected employee(s) data.</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel> {/* Disable cancel during deletion */}
							<AlertDialogAction
								onClick={handleDeleteConfirm}
								disabled={isDeleting} // Disable during deletion
								className='bg-red-600 hover:bg-red-700 text-white' // Maintain professional red color
							>
								{isDeleting ? (
									<>
										<Loading />
										Deleting...
									</>
								) : (
									"Continue"
								)}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}

export default CustomDataTable;
