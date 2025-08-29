"use client";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortDescIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import DataTable from "react-data-table-component";
import React from "react";
import { Label } from "@/components/ui/label";
import { BuildingsCombobox } from "@/components/BuildingsCombobox";

type RowData = {
	id: string;
	assignedTo?: string | null;
	customerName: string;
	customerEmail: string;
	customerPhone: string;
	buildingName: string;
	apartmentNumber: string;
	convenientTime: string;
	area: string;
	description: string;
	createdAt: string;
	status: string;
	completedBy?: string | null;
	completedOn?: string | null;
};

function CustomDataTable({ data, role, currentUser }: { data: RowData[]; role: "admin" | "employee"; currentUser: { fullName: string; role: string; username: string } }) {
	const router = useRouter();
	const [selectedArea, setSelectedArea] = React.useState("all");
	const [selectedBuilding, setSelectedBuilding] = React.useState("");

	const columns = [
		{ name: "ID", selector: (row: RowData) => row.id, sortable: true, grow: 0 },
		{
			name: "Assigned To",
			selector: (row: RowData) => row.assignedTo || "-",
			sortable: true,
			conditionalCellStyles: [
				{
					when: (row: RowData) => row.assignedTo === currentUser.username,
					style: { backgroundColor: "#fff9c4", color: "#155724" },
				},
			],
		},
		{ name: "Cust Name", selector: (row: RowData) => row.customerName, sortable: true },
		{ name: "Cust Email", selector: (row: RowData) => row.customerEmail, sortable: true },
		{ name: "Cust Phone", selector: (row: RowData) => row.customerPhone, sortable: true },
		{ name: "Bldg Name", selector: (row: RowData) => row.buildingName, sortable: true },
		{ name: "Apt Number", selector: (row: RowData) => row.apartmentNumber, sortable: true },
		{ name: "Convenient Time", selector: (row: RowData) => row.convenientTime, sortable: true },
		{ name: "Area", selector: (row: RowData) => row.area, sortable: true },
		{
			name: "Description",
			wrap: true,
			selector: (row: RowData) => row.description,
			format: (row: RowData) => {
				const maxLength = 100;
				return row.description.length > maxLength ? `${row.description.substring(0, maxLength)}...` : row.description;
			},
			sortable: true,
		},
		{ name: "Submitted On", selector: (row: RowData) => row.createdAt, sortable: true },
		{
			name: "Status",
			selector: (row: RowData) => row.status,
			sortable: true,
			conditionalCellStyles: [
				{ when: (row: RowData) => row.status === "Completed", style: { backgroundColor: "#d4edda", color: "#155724" } },
				{ when: (row: RowData) => row.status === "In Progress", style: { backgroundColor: "#fff3cd", color: "#856404" } },
				{ when: (row: RowData) => row.status === "Incomplete", style: { backgroundColor: "#f8d7da", color: "#721c24" } },
			],
		},
		{ name: "Completed By", selector: (row: RowData) => row.completedBy || "-", sortable: true },
		{ name: "Worked On", selector: (row: RowData) => row.completedOn || "-", sortable: true },
	];

	const filteredData = React.useMemo(() => {
		if (selectedBuilding) {
			return data.filter((row) => row.buildingName === selectedBuilding);
		} else if (selectedArea && selectedArea !== "all") {
			return data.filter((row) => row.area.includes(selectedArea));
		}
		return data;
	}, [data, selectedArea, selectedBuilding]);

	const handleRowClick = (row: RowData) => {
		router.push(`/dashboard/${role}/complaint/${row.id}`);
	};

	return (
		<div>
			<DataTable columns={columns} data={filteredData} pagination sortIcon={<SortDescIcon />} striped highlightOnHover pointerOnHover onRowClicked={handleRowClick} />

			<div className='ml-2 flex flex-row gap-4 items-center mb-1'>
				<Label className='mb-2'>Filter by Area:</Label>
				<Select
					onValueChange={(value) => {
						setSelectedArea(value);
						setSelectedBuilding("");
					}}
					value={selectedArea}>
					<SelectTrigger>
						<SelectValue placeholder='Select an area' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>All</SelectItem>
						<SelectGroup>
							<SelectLabel>By City</SelectLabel>
							<SelectItem value='Ajman'>Ajman</SelectItem>
							<SelectItem value='Sharjah'>Sharjah</SelectItem>
							<SelectItem value='Dubai'>Dubai</SelectItem>
						</SelectGroup>
						<SelectGroup>
							<SelectLabel>Ajman</SelectLabel>
							<SelectItem value='Al Nuaimia 1 - Ajman'>Al Nuaimia 1</SelectItem>
							<SelectItem value='Al Jerf - Ajman'>Al Jerf</SelectItem>
						</SelectGroup>
						<SelectGroup>
							<SelectLabel>Sharjah</SelectLabel>
							<SelectItem value='Taawun - Sharjah'>Taawun</SelectItem>
							<SelectItem value='Al Nahda - Sharjah'>Al Nahda</SelectItem>
							<SelectItem value='Al Khan - Sharjah'>Al Khan</SelectItem>
							<SelectItem value='Al Majaz 1 - Sharjah'>Al Majaz 1</SelectItem>
							<SelectItem value='Al Majaz 2 - Sharjah'>Al Majaz 2</SelectItem>
							<SelectItem value='Abu Shagara - Sharjah'>Abu Shagara</SelectItem>
							<SelectItem value='Al Qasimia - Sharjah'>Al Qasimia</SelectItem>
							<SelectItem value='Muwaileh - Sharjah'>Muwaileh</SelectItem>
							<SelectItem value='Industrial 15 - Sharjah'>Industrial 15</SelectItem>
						</SelectGroup>
						<SelectGroup>
							<SelectLabel>Dubai</SelectLabel>
							<SelectItem value='Al Nahda - Dubai'>Al Nahda</SelectItem>
							<SelectItem value='Al Qusais - Dubai'>Al Qusais</SelectItem>
							<SelectItem value='Al Garhoud - Dubai'>Al Garhoud</SelectItem>
							<SelectItem value='Warsan - Dubai'>Warsan</SelectItem>
							<SelectItem value='Silicon - Dubai'>Silicon</SelectItem>
							<SelectItem value='Ras al Khor - Dubai'>Ras al Khor</SelectItem>
							<SelectItem value='Al Barsha - Dubai'>Al Barsha</SelectItem>
							<SelectItem value='DIP - Dubai'>DIP</SelectItem>
							<SelectItem value='DIC - Dubai'>DIC</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>

				{/* <Label className='mb-2'>Filter by Building:</Label>
				<BuildingsCombobox
					options={buildings.map((building) => ({ label: building, value: building }))}
					value={selectedBuilding}
					onChange={(val) => {
						setSelectedBuilding(val);
						setSelectedArea("all");
					}}
					placeholder='Select a building'
					className='w-2xl'
				/> */}
			</div>
		</div>
	);
}

export default CustomDataTable;
