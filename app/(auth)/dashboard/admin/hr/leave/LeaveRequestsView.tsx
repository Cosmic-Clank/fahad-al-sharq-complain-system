import React from "react";
import { CalendarHeart } from "lucide-react";
import { todayYmdDubai } from "@/lib/hr-dates";
import { getLeaveRows } from "@/lib/hr-leave-server";
import LeaveSection from "./LeaveSection";

/** All employees' leave: pending first, then recent decisions. Route access is enforced by the role layouts. */
export default async function LeaveRequestsView({ employeesBase }: { employeesBase: string }) {
	const [pending, recent] = await Promise.all([getLeaveRows({ status: "PENDING" }, 200), getLeaveRows({ status: { not: "PENDING" } }, 50)]);
	const today = todayYmdDubai();

	return (
		<div className='p-4 space-y-6 max-w-4xl'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<CalendarHeart className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>Leave Requests</h1>
				</div>
				<p className='text-gray-600 mt-1'>Approve or reject leave. To record leave for someone who doesn&apos;t use the app, open their profile → Leave tab.</p>
			</div>

			<section className='space-y-3'>
				<h2 className='text-lg font-semibold'>Waiting for approval ({pending.length})</h2>
				<LeaveSection rows={pending} employeesBase={employeesBase} today={today} emptyText='Nothing waiting for approval.' />
			</section>

			<section className='space-y-3'>
				<h2 className='text-lg font-semibold'>Recent decisions</h2>
				<LeaveSection rows={recent} employeesBase={employeesBase} today={today} emptyText='No decided leave yet.' />
			</section>
		</div>
	);
}
