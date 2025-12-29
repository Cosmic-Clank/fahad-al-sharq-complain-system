"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { updateEmployeeDetails } from "@/app/(auth)/dashboard/components/actions";
import { Loading } from "@/components/ui/loading";

interface EmployeeEditDialogProps {
	employee: {
		id: number;
		fullName: string;
		username: string;
		role: string;
	};
}

export default function EmployeeEditDialog({ employee }: EmployeeEditDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [fullName, setFullName] = useState(employee.fullName);
	const [username, setUsername] = useState(employee.username);
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validate full name
		if (!fullName || fullName.trim() === "") {
			setError("Full name cannot be empty.");
			return;
		}

		// Validate username
		if (!username || username.trim() === "") {
			setError("Username cannot be empty.");
			return;
		}

		// Validate password if provided
		if (password || confirmPassword) {
			if (password !== confirmPassword) {
				setError("Passwords do not match.");
				return;
			}
			if (password.length < 6) {
				setError("Password must be at least 6 characters long.");
				return;
			}
		}

		setIsLoading(true);
		try {
			const result = await updateEmployeeDetails(employee.id, fullName.trim(), username.trim(), password || undefined);

			if (result.success) {
				setIsOpen(false);
				setPassword("");
				setConfirmPassword("");
				window.location.reload();
			} else {
				setError(result.message || "Failed to update employee details.");
			}
		} catch (err) {
			setError("Something went wrong. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<Button size='sm' variant='outline' onClick={() => setIsOpen(true)} className='flex items-center gap-2'>
				<Pencil className='w-4 h-4' />
				Edit
			</Button>

			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>Edit Employee Details</DialogTitle>
					<DialogDescription>Update the employee's name and password.</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='fullName'>Full Name</Label>
						<Input id='fullName' value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder='Enter full name' disabled={isLoading} />
					</div>

					<div className='space-y-2'>
						<Label htmlFor='username'>Username</Label>
						<Input id='username' value={username} onChange={(e) => setUsername(e.target.value)} placeholder='Enter username' disabled={isLoading} />
					</div>

					<div className='space-y-2'>
						<Label htmlFor='password'>New Password (Optional)</Label>
						<Input id='password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} placeholder='Leave empty to keep current password' disabled={isLoading} />
					</div>

					<div className='space-y-2'>
						<Label htmlFor='confirmPassword'>Confirm Password</Label>
						<Input id='confirmPassword' type='password' value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder='Confirm new password' disabled={isLoading} />
					</div>

					{error && <p className='text-xs text-red-600 border border-red-200 bg-red-50 rounded px-2 py-1'>{error}</p>}

					<DialogFooter className='pt-4'>
						<Button
							type='button'
							variant='outline'
							onClick={() => {
								setIsOpen(false);
								setError(null);
								setPassword("");
								setConfirmPassword("");
								setFullName(employee.fullName);
								setUsername(employee.username);
							}}
							disabled={isLoading}>
							Cancel
						</Button>
						<Button type='submit' disabled={isLoading} className='text-white'>
							{isLoading ? (
								<span className='inline-flex items-center gap-2'>
									<Loading /> Saving…
								</span>
							) : (
								"Save Changes"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
