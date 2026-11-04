"use client";

import * as React from "react";
import { Plus, Power, PowerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBuilding, setBuildingActive } from "./actions";
import { toast } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Building = { id: string; buildingName: string; emirate: string; isActive: boolean };

// Emirates list
const EMIRATE_OPTIONS = ["Ajman", "Sharjah", "Dubai"];

export default function BuildingsClient({ buildings }: { buildings: Building[] }) {
	const [openAdd, setOpenAdd] = React.useState(false);
	const [name, setName] = React.useState("");
	const [emirate, setEmirate] = React.useState("");

	const canSave = Boolean(name.trim()) && Boolean(emirate.trim());

	return (
		<div className='mx-auto max-w-3xl p-6 space-y-6'>
			<Card>
				<CardHeader className='flex items-center justify-between gap-4'>
					<div className='flex-1'>
						<CardTitle className='text-2xl'>Buildings</CardTitle>
					</div>

					{/* Add building */}
					<Dialog open={openAdd} onOpenChange={setOpenAdd}>
						<DialogTrigger asChild>
							<Button className='gap-2'>
								<Plus className='h-4 w-4' />
								Add Building
							</Button>
						</DialogTrigger>
						<DialogContent className='sm:max-w-md'>
							<DialogHeader>
								<DialogTitle>Add a new building</DialogTitle>
								<DialogDescription>Both fields are required.</DialogDescription>
							</DialogHeader>

							<div className='grid gap-4'>
								{/* Building name */}
								<div className='grid gap-2'>
									<Label htmlFor='buildingName'>Building Name</Label>
									<Input id='buildingName' placeholder='e.g., Al Barsha 1' value={name} onChange={(e) => setName(e.target.value)} />
								</div>

								{/* Emirate selection */}
								<div className='grid gap-2'>
									<Label>Emirate</Label>
									<Select value={emirate} onValueChange={setEmirate}>
										<SelectTrigger>
											<SelectValue placeholder='Select an emirate' />
										</SelectTrigger>
										<SelectContent className='max-h-80'>
											{EMIRATE_OPTIONS.map((opt) => (
												<SelectItem key={opt} value={opt}>
													{opt}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className='flex justify-end'>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button type='button' disabled={!canSave}>
												Save
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Confirm addition</AlertDialogTitle>
												<AlertDialogDescription>
													Add <span className='font-semibold'>{name || "this building"}</span> in <span className='font-semibold'>{emirate || "selected emirate"}</span>?
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>

												{/* Actual submit */}
												<form
													action={async (formData: FormData) => {
														formData.set("buildingName", name);
														formData.set("emirate", emirate);
														await createBuilding(formData);
														setName("");
														setEmirate("");
														setOpenAdd(false);
													}}>
													<AlertDialogAction asChild>
														<Button type='submit'>Confirm</Button>
													</AlertDialogAction>
												</form>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</div>

							<DialogFooter />
						</DialogContent>
					</Dialog>
				</CardHeader>

				<CardContent>
					<div className='rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className='w-[60px] text-center'>#</TableHead>
									<TableHead>Building Name</TableHead>
									<TableHead>Emirate</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className='w-[140px] text-right'>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{buildings.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} className='text-center text-muted-foreground'>
											No buildings yet. Click “Add Building”.
										</TableCell>
									</TableRow>
								) : (
									buildings.map((b, idx) => (
										<TableRow key={b.id} className={b.isActive ? undefined : "text-muted-foreground"}>
											<TableCell className='text-center align-middle'>{idx + 1}</TableCell>
											<TableCell className='font-medium'>{b.buildingName}</TableCell>
											<TableCell>{b.emirate || "—"}</TableCell>
											<TableCell>
												{b.isActive ? (
													<Badge className='bg-green-100 text-green-800 hover:bg-green-100'>Active</Badge>
												) : (
													<Badge variant='secondary'>Inactive</Badge>
												)}
											</TableCell>
											<TableCell className='text-right'>
												<ActiveToggleButton building={b} />
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function ActiveToggleButton({ building }: { building: Building }) {
	const router = useRouter();
	const [busy, setBusy] = React.useState(false);
	const deactivating = building.isActive;

	const confirm = async () => {
		setBusy(true);
		try {
			const result = await setBuildingActive(Number(building.id), !deactivating);
			if (result.success) {
				toast.success(result.message);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant={deactivating ? "outline" : "default"} size='sm' className='gap-2' disabled={busy}>
					{deactivating ? <PowerOff className='h-4 w-4' /> : <Power className='h-4 w-4' />}
					{deactivating ? "Deactivate" : "Reactivate"}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{deactivating ? "Deactivate building" : "Reactivate building"}</AlertDialogTitle>
					<AlertDialogDescription>
						{deactivating ? (
							<>
								<span className='font-semibold'>{building.buildingName}</span> will no longer appear on the complaint forms or the inventory request form. Its past complaints, requests and reports are kept, and you can reactivate it any time.
							</>
						) : (
							<>
								<span className='font-semibold'>{building.buildingName}</span> will appear on the complaint forms and the inventory request form again.
							</>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className='gap-2'>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={confirm}>{deactivating ? "Deactivate" : "Reactivate"}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
