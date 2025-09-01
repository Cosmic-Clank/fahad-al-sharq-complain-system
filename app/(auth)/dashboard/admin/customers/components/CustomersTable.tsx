"use client";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortDescIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import DataTable from "react-data-table-component";
import React from "react";
import { Label } from "@/components/ui/label";

type RowData = {
	buildingName: string;
	apartmentNumber: string;
	complaintCount: number;
	thisMonthCount: number; // NEW
	latestComplaintAt: string;
	customerName: string;
	customerEmail: string;
	customerPhone: string;
	customerAddress: string;
};

function CustomDataTable({ data, role, currentUser }: { data: RowData[]; role: "admin" | "employee"; currentUser: { fullName: string; role: string; username: string } }) {
	const columns = [
		{
			name: "Building Name",
			selector: (row: RowData) => row.buildingName,
			sortable: true,
		},
		{
			name: "Apartment Number",
			selector: (row: RowData) => row.apartmentNumber,
			sortable: true,
		},
		{
			name: "Complaint Count",
			selector: (row: RowData) => row.complaintCount,
			sortable: true,
		},
		{
			// NEW column
			name: "This Month",
			selector: (row: RowData) => row.thisMonthCount,
			sortable: true,
			conditionalCellStyles: [
				{
					when: (row: RowData) => row.thisMonthCount >= 2,
					style: {
						backgroundColor: "#f8d7da", // red alert background
						color: "#842029",
						fontWeight: 600,
					},
				},
			],
		},
		{
			name: "Latest Complaint At",
			selector: (row: RowData) => row.latestComplaintAt,
			sortable: true,
		},
		{
			name: "Cust Name",
			selector: (row: RowData) => row.customerName,
			sortable: true,
		},
		{
			name: "Cust Email",
			selector: (row: RowData) => row.customerEmail,
			sortable: true,
		},
		{
			name: "Cust Phone",
			selector: (row: RowData) => row.customerPhone,
			sortable: true,
		},
		{
			name: "Cust Address",
			selector: (row: RowData) => row.customerAddress,
			sortable: true,
		},
	];

	return (
		<div className=''>
			<DataTable columns={columns} data={data} pagination sortIcon={<SortDescIcon />} striped highlightOnHover />
		</div>
	);
}

export default CustomDataTable;
