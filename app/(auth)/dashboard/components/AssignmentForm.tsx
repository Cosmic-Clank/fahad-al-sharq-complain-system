"use client";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import prismaClient from "@/lib/prisma";
import { assignComplaintToUser, fetchUsers } from "./actions";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
type User = {
	id: number;
	username: string;
	fullName: string;
};

function AssignmentForm({ complaintId }: { complaintId: number }) {
	const [isLoading, setIsLoading] = React.useState(false);
	const [assignedTo, setAssignedTo] = React.useState<number>();
	const [users, setUsers] = React.useState<User[]>([]);
	React.useEffect(() => {
		const fetchAndSetUsers = async () => {
			const users = await fetchUsers();
			setUsers(users);
		};
		fetchAndSetUsers();
	}, []);
	return (
		<div className='flex'>
			<Select onValueChange={(value) => setAssignedTo(Number(value))}>
				<SelectTrigger className='w-[180px]'>
					<SelectValue placeholder='Assign to' />
				</SelectTrigger>
				<SelectContent>
					{users.map((user) => (
						<SelectItem key={user.id} value={String(user.id)}>
							{user.fullName}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button
				disabled={!assignedTo || isLoading}
				className='ml-2'
				onClick={async () => {
					setIsLoading(true);
					assignedTo ? await assignComplaintToUser(complaintId, assignedTo) : null;
					setIsLoading(false);
				}}>
				Assign
				{isLoading && <Loading className='ml-2' />}
			</Button>
		</div>
	);
}

export default AssignmentForm;
