"use client";

import * as React from "react";
import DataTable from "react-data-table-component";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SortDescIcon, Lock, Globe } from "lucide-react";
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
	createdAtISO?: string;
	status: string; // "Completed" | "In Progress" | "Incomplete"
	completedBy?: string | null;
	completedOn?: string | null;
	isPrivate?: boolean;
};

export default function CustomDataTable({ data, role, currentUser }: { data: RowData[]; role: "admin" | "employee"; currentUser: { fullName: string; role: string; username: string } }) {
	const router = useRouter();

	// Page and date filters live in the URL so the browser back button restores them.
	// useSearchParams stays in sync with native history.replaceState (Next 14.1+),
	// and matches on the server render, avoiding hydration mismatches.
	const searchParams = useSearchParams();
	const fromParam = searchParams.get("from") ?? "";
	const toParam = searchParams.get("to") ?? "";
	const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
	const pageParam = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

	const updateParams = (updates: Record<string, string | null>) => {
		const params = new URLSearchParams(window.location.search);
		for (const [key, value] of Object.entries(updates)) {
			if (value === null || value === "") params.delete(key);
			else params.set(key, value);
		}
		const qs = params.toString();
		// Never touch history when nothing changes: a replaceState fired while the
		// router is restoring a back/forward navigation deadlocks Next's action
		// queue (server actions hang, router.push stops committing).
		if (qs === new URLSearchParams(window.location.search).toString()) return;
		window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
	};

	const handlePageChange = (page: number) => {
		// The table echoes back the page we passed via paginationDefaultPage when it
		// (re)mounts — e.g. right after back-navigation. Only persist real changes.
		if (page === currentPage) return;
		updateParams({ page: page === 1 ? null : String(page) });
	};

	// Changing the date filter resets pagination
	const handleFromChange = (value: string) => updateParams({ from: value || null, page: null });
	const handleToChange = (value: string) => updateParams({ to: value || null, page: null });
	const clearDateFilter = () => updateParams({ from: null, to: null, page: null });

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

	// Filter complaints using buildingName based on emirate selection, plus submission date range
	const filteredData = React.useMemo(() => {
		let out = data;
		if (selectedEmirate) {
			const namesInEmirate = new Set(buildings.map((b) => b.buildingName));
			out = out.filter((row) => namesInEmirate.has(row.buildingName));
		}
		if (selectedBuilding) {
			out = out.filter((row) => row.buildingName === selectedBuilding);
		}
		if (fromParam) {
			const fromDate = new Date(`${fromParam}T00:00:00`);
			if (!isNaN(fromDate.getTime())) {
				out = out.filter((row) => row.createdAtISO && new Date(row.createdAtISO) >= fromDate);
			}
		}
		if (toParam) {
			const toDate = new Date(`${toParam}T23:59:59.999`);
			if (!isNaN(toDate.getTime())) {
				out = out.filter((row) => row.createdAtISO && new Date(row.createdAtISO) <= toDate);
			}
		}
		return out;
	}, [data, selectedEmirate, selectedBuilding, buildings, fromParam, toParam]);

	// Clamp the URL page to what actually exists for the current filters
	const [perPage, setPerPage] = React.useState(10);
	const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage));
	const currentPage = Math.min(pageParam, totalPages);

	const columns = [
		{ name: "ID", selector: (row: RowData) => row.id, sortable: true, grow: 0 },
		{
			name: "Type",
			selector: (row: RowData) => (row.isPrivate ? "Private" : "Public"),
			sortable: true,
			grow: 0,
			cell: (row: RowData) =>
				row.isPrivate ? (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 whitespace-nowrap">
						<Lock className="w-3 h-3 shrink-0" /> Private
					</span>
				) : (
					<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
						<Globe className="w-3 h-3 shrink-0" /> Public
					</span>
				),
			width: "110px",
		},
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
	const { completedCount, pendingCount, incompleteCount, totalCount } = React.useMemo(() => {
		const total = filteredData.length;
		let completed = 0;
		let pending = 0; // "In Progress"
		let incomplete = 0;

		for (const r of filteredData) {
			if (r.status === "Completed") completed++;
			else if (r.status === "In Progress") pending++;
			else if (r.status === "Incomplete") incomplete++;
		}

		return { completedCount: completed, pendingCount: pending, incompleteCount: incomplete, totalCount: total };
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

			{/* Layer 2: Buildings */}
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

			{/* Date range filter */}
			<div className='rounded-md border p-3 space-y-2'>
				<Label className='text-sm font-semibold'>Filter by Date</Label>
				<div className='flex flex-wrap items-end gap-3'>
					<div className='space-y-1'>
						<Label htmlFor='date-from' className='text-xs text-gray-600'>
							From
						</Label>
						<Input id='date-from' type='date' value={fromParam} max={toParam || undefined} onChange={(e) => handleFromChange(e.target.value)} className='w-fit' />
					</div>
					<div className='space-y-1'>
						<Label htmlFor='date-to' className='text-xs text-gray-600'>
							To
						</Label>
						<Input id='date-to' type='date' value={toParam} min={fromParam || undefined} onChange={(e) => handleToChange(e.target.value)} className='w-fit' />
					</div>
					{(fromParam || toParam) && (
						<Button variant='outline' onClick={clearDateFilter}>
							Clear
						</Button>
					)}
				</div>
			</div>

			{/* Status summary */}
			<div className='rounded-md border p-3 flex items-center justify-between'>
				<div>
					<Label className='text-sm font-semibold'>Status Summary</Label>
					<div className='mt-1 flex gap-2 items-center'>
						<Badge className='bg-green-100 text-green-800'>Completed: {completedCount}</Badge>
						<Badge className='bg-yellow-100 text-yellow-800'>Pending: {pendingCount}</Badge>
						<Badge className='bg-red-100 text-red-800'>Incomplete: {incompleteCount}</Badge>
						<Badge variant='secondary'>Total: {totalCount}</Badge>
					</div>
				</div>
				<div className='text-sm text-gray-600'>Counts reflect current filters</div>
			</div>

			{/* Table */}
			<DataTable columns={columns} data={filteredData} pagination paginationDefaultPage={currentPage} onChangePage={handlePageChange} onChangeRowsPerPage={(n) => setPerPage(n)} sortIcon={<SortDescIcon />} striped highlightOnHover pointerOnHover onRowClicked={handleRowClick} />
		</div>
	);
}
