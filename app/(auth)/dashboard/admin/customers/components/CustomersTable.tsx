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
			conditionalCellStyles: [
				{
					when: (row: RowData) => {
						// Assuming latestComplaintAt is an ISO string
						const latestDate = new Date(row.latestComplaintAt);
						const oneMonthAgo = new Date();
						oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
						return row.complaintCount > 1 && latestDate >= oneMonthAgo;
					},
					style: {
						backgroundColor: "#f8d7da",
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
