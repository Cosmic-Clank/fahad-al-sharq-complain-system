"use client";
import { SortDescIcon } from "lucide-react";
import DataTable from "react-data-table-component";

type RowData = {
	id: string;
	customerName: string;
	customerEmail: string;
	customerPhone: string;
	billNumber: string;
	area: string;
	description: string;
	createdAt: string;
};

const columns = [
	{
		name: "ID",
		selector: (row: RowData) => row.id,
		sortable: true,
	},
	{
		name: "Customer Name",
		selector: (row: RowData) => row.customerName,
		sortable: true,
	},
	{
		name: "Customer Email",
		selector: (row: RowData) => row.customerEmail,
		sortable: true,
	},
	{
		name: "Customer Phone",
		selector: (row: RowData) => row.customerPhone,
		sortable: true,
	},
	{
		name: "Bill Number",
		selector: (row: RowData) => row.billNumber,
		sortable: true,
	},
	{
		name: "Area",
		selector: (row: RowData) => row.area,
		sortable: true,
	},
	{
		name: "Description",
		wrap: true,
		selector: (row: RowData) => row.description,
		format: (row: RowData) => {
			const maxLength = 100; // Maximum length of the description to display
			return row.description.length > maxLength ? `${row.description.substring(0, maxLength)}...` : row.description;
		},
		sortable: true,
	},
	{
		name: "Created At",
		selector: (row: RowData) => row.createdAt,
		sortable: true,
	},
];

function CustomDataTable({ data }: { data: RowData[] }) {
	const handleRowClick = (row: RowData) => {
		window.location.href = `/dashboard/employee/complaint/${row.id}`;
	};

	return <DataTable columns={columns} data={data} pagination sortIcon={<SortDescIcon />} striped highlightOnHover pointerOnHover onRowClicked={handleRowClick} />;
}

export default CustomDataTable;
