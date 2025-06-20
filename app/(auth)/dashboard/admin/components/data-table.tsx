"use client";
import DataTable from "react-data-table-component";

const columns = [
	{
		name: "Title",
		selector: (row: { title: any }) => row.title,
	},
	{
		name: "Year",
		selector: (row: { year: any }) => row.year,
	},
];

const data = [
	{
		id: 1,
		title: "Beetlejuice",
		year: "1988",
	},
	{
		id: 2,
		title: "Ghostbusters",
		year: "1984",
	},
];

function CustomDataTable() {
	return <DataTable columns={columns} data={data} />;
}

export default CustomDataTable;
