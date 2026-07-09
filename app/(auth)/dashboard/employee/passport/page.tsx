import React from "react";
import { auth } from "@/auth";
import prismaClient from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { BookUser } from "lucide-react";
import PassportRequestForm from "./components/PassportRequestForm";

const STATUS_STYLES: Record<string, string> = {
	REQUESTED: "bg-blue-100 text-blue-800",
	APPROVED: "bg-amber-100 text-amber-800",
	HANDED_OVER: "bg-purple-100 text-purple-800",
	RETURNED: "bg-green-100 text-green-800",
	REJECTED: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
	REQUESTED: "Requested — awaiting approval",
	APPROVED: "Approved — collect from admin",
	HANDED_OVER: "With you",
	RETURNED: "Returned",
	REJECTED: "Rejected",
};

async function page() {
	const session = await auth();
	const userId = Number(session?.user?.id);
	if (!userId) return <div className='p-6 text-red-500'>Could not load your account.</div>;

	const handovers = await prismaClient.passportHandover.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
	});

	const hasOpen = handovers.some((h) => ["REQUESTED", "APPROVED", "HANDED_OVER"].includes(h.status));

	return (
		<div className='p-4 space-y-4 max-w-3xl'>
			<div className='p-6 bg-white rounded-sm border-t-4 border-primary'>
				<div className='flex items-center gap-2'>
					<BookUser className='h-6 w-6 text-primary' />
					<h1 className='text-3xl font-bold'>My Passport</h1>
				</div>
				<p className='text-gray-600 mt-1'>Your passport is kept by the company. Submit a request when you need it; both you and the admin sign at handover and again at return.</p>
			</div>

			<Card className='p-6'>
				<PassportRequestForm disabled={hasOpen} />
				{hasOpen && <p className='text-xs text-amber-600 mt-2'>You have an open request or your passport is currently with you — a new request is not possible.</p>}
			</Card>

			<div className='space-y-3'>
				<h2 className='text-lg font-semibold'>History</h2>
				{handovers.length === 0 ? (
					<Card className='p-6 text-center text-gray-500 text-sm'>No requests yet.</Card>
				) : (
					handovers.map((h) => (
						<Card key={h.id} className='p-4 text-sm space-y-1'>
							<div className='flex items-center gap-2'>
								<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[h.status] ?? ""}`}>{STATUS_LABELS[h.status] ?? h.status}</span>
								<span className='text-xs text-gray-400'>{h.requestedAt.toLocaleString()}</span>
							</div>
							{h.requestReason && <p className='text-gray-600'>{h.requestReason}</p>}
							<div className='text-xs text-gray-500 space-x-3'>
								{h.handedOverAt && <span>Handed over: {h.handedOverAt.toLocaleString()}</span>}
								{h.returnedAt && <span>Returned: {h.returnedAt.toLocaleString()}</span>}
							</div>
						</Card>
					))
				)}
			</div>
		</div>
	);
}

export default page;
