"use client";

import * as React from "react";
import DataTable from "react-data-table-component";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SortDescIcon } from "lucide-react";
import { getEmirates, getBuildingsByEmirate, type Building } from "./buildingActions";

type RowData = {
	id: string;
	assignedTo?: string | null;
	customerName: string;
	customerEmail: string;
	customerPhone: string;
	buildingName: string;
	apartmentNumber: string;
	convenientTime: string;
	description: string;
	createdAt: string;
	status: string;
	completedBy?: string | null;
	completedOn?: string | null;
};

export default function CustomDataTable({ data, role, currentUser }: { data: RowData[]; role: "admin" | "employee"; currentUser: { fullName: string; role: string; username: string } }) {
	const router = useRouter();

	// Selections
	const [selectedEmirate, setSelectedEmirate] = React.useState<string | null>(null);
	const [selectedBuilding, setSelectedBuilding] = React.useState<string | null>(null);

	// Emirate & building data (from Buildings table)
	const [emirates, setEmirates] = React.useState<string[]>([]);
	const [buildings, setBuildings] = React.useState<Building[]>([]);
	const [loadingEmirates, startEmiratesTransition] = React.useTransition();
	const [loadingBuildings, startBuildingsTransition] = React.useTransition();

	// Load all emirates once
	React.useEffect(() => {
		startEmiratesTransition(async () => {
			try {
				const list = await getEmirates();
				setEmirates(list);
			} catch (e) {
				console.error("Failed to fetch emirates", e);
				setEmirates([]);
			}
		});
	}, []);

	// Load buildings when an emirate is chosen
	React.useEffect(() => {
		if (!selectedEmirate) {
			setBuildings([]);
			setSelectedBuilding(null);
			return;
		}
		startBuildingsTransition(async () => {
			try {
				const rows = await getBuildingsByEmirate(selectedEmirate);
				setBuildings(rows);
			} catch (e) {
				console.error("Failed to fetch buildings for emirate:", selectedEmirate, e);
				setBuildings([]);
			}
		});
	}, [selectedEmirate]);

	// Filter complaints using buildingName based on emirate selection
	const filteredData = React.useMemo(() => {
		let out = data;
		if (selectedEmirate) {
			const namesInEmirate = new Set(buildings.map((b) => b.buildingName));
			out = out.filter((row) => namesInEmirate.has(row.buildingName));
		}
		if (selectedBuilding) {
			out = out.filter((row) => row.buildingName === selectedBuilding);
		}
		return out;
	}, [data, selectedEmirate, selectedBuilding, buildings]);

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

	const handleRowClick = (row: RowData) => {
		router.push(`/dashboard/${role}/complaint/${row.id}`);
	};

	// Status counts (based on currently filtered data)
	const { completedCount, incompleteCount, totalCount } = React.useMemo(() => {
		const total = filteredData.length;
		let completed = 0;
		let incomplete = 0;
		for (const r of filteredData) {
			if (r.status === "Completed") completed++;
			if (r.status === "Incomplete") incomplete++;
		}
		return { completedCount: completed, incompleteCount: incomplete, totalCount: total };
	}, [filteredData]);

	return (
		<div className='space-y-4'>
			{/* Layer 1: Emirate */}
			<div className='rounded-md border p-3 space-y-2'>
				<Label className='text-sm font-semibold'>Select Emirate</Label>
				<div className='flex flex-wrap gap-2'>
					<Button
						variant={!selectedEmirate ? "default" : "outline"}
						onClick={() => {
							setSelectedEmirate(null);
							setSelectedBuilding(null);
						}}
						disabled={loadingEmirates}>
						All Emirates
					</Button>
					{loadingEmirates ? (
						<Button variant='outline' disabled>
							Loading…
						</Button>
					) : emirates.length === 0 ? (
						<Button variant='outline' disabled>
							No emirates
						</Button>
					) : (
						emirates.map((e) => (
							<Button
								key={e}
								variant={selectedEmirate === e ? "default" : "outline"}
								onClick={() => {
									setSelectedEmirate(e);
									setSelectedBuilding(null);
								}}>
								{e}
							</Button>
						))
					)}
				</div>
			</div>

			{/* Layer 2: Buildings (from the Buildings table for the selected emirate) */}
			{selectedEmirate && (
				<div className='rounded-md border p-3 space-y-2'>
					<Label className='text-sm font-semibold'>Buildings in {selectedEmirate}</Label>
					<div className='flex flex-wrap gap-2'>
						<Button variant={!selectedBuilding ? "default" : "outline"} onClick={() => setSelectedBuilding(null)}>
							All {selectedEmirate}
						</Button>

						{loadingBuildings ? (
							<Button variant='outline' disabled>
								Loading…
							</Button>
						) : buildings.length === 0 ? (
							<Button variant='outline' disabled>
								No buildings
							</Button>
						) : (
							buildings.map((b) => (
								<Button key={`${b.emirate}:${b.buildingName}`} variant={selectedBuilding === b.buildingName ? "default" : "outline"} onClick={() => setSelectedBuilding(b.buildingName)}>
									{b.buildingName}
								</Button>
							))
						)}
					</div>

					<div className='mt-1 flex gap-2 flex-wrap'>
						<Badge variant='secondary'>{selectedEmirate}</Badge>
						{selectedBuilding && <Badge variant='outline'>{selectedBuilding}</Badge>}
					</div>
				</div>
			)}

			{/* Status summary */}
			<div className='rounded-md border p-3 flex items-center justify-between'>
				<div>
					<Label className='text-sm font-semibold'>Status Summary</Label>
					<div className='mt-1 flex gap-2 items-center'>
						<Badge className='bg-green-100 text-green-800'>Completed: {completedCount}</Badge>
						<Badge className='bg-red-100 text-red-800'>Incomplete: {incompleteCount}</Badge>
						<Badge variant='secondary'>Total: {totalCount}</Badge>
					</div>
				</div>
				{/* small legend for other statuses */}
				<div className='text-sm text-gray-600'>Showing counts for the current filters</div>
			</div>

			{/* Table */}
			<DataTable columns={columns} data={filteredData} pagination sortIcon={<SortDescIcon />} striped highlightOnHover pointerOnHover onRowClicked={handleRowClick} />
		</div>
	);
}
