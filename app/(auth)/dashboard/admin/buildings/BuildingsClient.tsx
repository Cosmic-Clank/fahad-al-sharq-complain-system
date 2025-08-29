// components/buildings/BuildingsClient.tsx
"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { createBuilding, deleteBuilding } from "./actions"; // ✅ importing server actions is allowed for form actions

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Building = { id: string; buildingName: string };

export default function BuildingsClient({ buildings }: { buildings: Building[] }) {
	const [openAdd, setOpenAdd] = React.useState(false);
	const [name, setName] = React.useState("");

	return (
		<div className='mx-auto max-w-3xl p-6 space-y-6'>
			<Card>
				<CardHeader className='flex items-center justify-between gap-4'>
					<div className='flex-1'>
						<CardTitle className='text-2xl'>Buildings</CardTitle>
					</div>

					{/* Add building — enter name in Dialog, confirm in AlertDialog, submit server action */}
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
								<DialogDescription>Type the name, then confirm before saving.</DialogDescription>
							</DialogHeader>

							<div className='grid gap-4'>
								<div className='grid gap-2'>
									<Label htmlFor='buildingName'>Building Name</Label>
									<Input id='buildingName' placeholder='e.g., Al Barsha 1' value={name} onChange={(e) => setName(e.target.value)} />
								</div>

								<div className='flex justify-end'>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button type='button' disabled={!name.trim()}>
												Save
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Confirm addition</AlertDialogTitle>
												<AlertDialogDescription>
													Add <span className='font-semibold'>{name || "this building"}</span> to the database?
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>

												{/* Actual submit to server action */}
												<form
													action={async (formData: FormData) => {
														formData.set("buildingName", name);
														await createBuilding(formData);
														setName("");
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
									<TableHead className='w-[120px] text-right'>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{buildings.length === 0 ? (
									<TableRow>
										<TableCell colSpan={3} className='text-center text-muted-foreground'>
											No buildings yet. Click “Add Building”.
										</TableCell>
									</TableRow>
								) : (
									buildings.map((b, idx) => (
										<TableRow key={b.id}>
											<TableCell className='text-center align-middle'>{idx + 1}</TableCell>
											<TableCell className='font-medium'>{b.buildingName}</TableCell>
											<TableCell className='text-right'>
												<DeleteButton id={b.id} name={b.buildingName} />
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

function DeleteButton({ id, name }: { id: string; name: string }) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant='destructive' size='sm' className='gap-2'>
					<Trash2 className='h-4 w-4' />
					Delete
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete building</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to remove <span className='font-semibold'>{name}</span>? This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className='gap-2'>
					<AlertDialogCancel>Cancel</AlertDialogCancel>

					{/* Submit directly to server action */}
					<form action={deleteBuilding}>
						<input type='hidden' name='id' value={id} />
						<AlertDialogAction asChild>
							<Button type='submit' variant='destructive'>
								Confirm Delete
							</Button>
						</AlertDialogAction>
					</form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
