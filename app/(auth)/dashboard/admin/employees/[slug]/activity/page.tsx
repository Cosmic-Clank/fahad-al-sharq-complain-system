import React from "react";
import Link from "next/link";
import prismaClient from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

const PAGE_SIZE = 50;

async function page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
	const slug = (await params).slug;
	const sp = await searchParams;
	const userId = Number(slug);
	const pageNum = Math.max(1, Number(sp.page) || 1);

	const [logs, total] = await Promise.all([
		prismaClient.activityLog.findMany({
			where: { OR: [{ targetUserId: userId }, { actorId: userId }] },
			orderBy: { createdAt: "desc" },
			skip: (pageNum - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
			include: {
				actor: { select: { fullName: true } },
				target: { select: { fullName: true } },
			},
		}),
		prismaClient.activityLog.count({ where: { OR: [{ targetUserId: userId }, { actorId: userId }] } }),
	]);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return (
		<div className='space-y-4'>
			<h2 className='text-lg font-semibold flex items-center gap-2'>
				<History className='w-5 h-5 text-primary' /> Activity Log
				<span className='text-sm font-normal text-gray-500'>({total} entries)</span>
			</h2>

			{logs.length === 0 ? (
				<Card className='p-8 text-center text-gray-500 text-sm'>No activity recorded yet. Actions performed by or about this employee will appear here.</Card>
			) : (
				<div className='space-y-2'>
					{logs.map((log) => (
						<Card key={log.id} className='p-3 flex items-start justify-between gap-4'>
							<div className='space-y-1 min-w-0'>
								<div className='flex items-center gap-2 flex-wrap'>
									<Badge variant='outline' className='text-xs'>
										{log.action}
									</Badge>
									<span className='text-xs text-gray-400'>{log.entityType}</span>
									{log.actorId === userId && <Badge className='bg-blue-100 text-blue-800 text-xs'>did this</Badge>}
								</div>
								<p className='text-sm text-gray-700'>{log.details ?? "—"}</p>
							</div>
							<span className='text-xs text-gray-500 whitespace-nowrap shrink-0'>{log.createdAt.toLocaleString()}</span>
						</Card>
					))}
				</div>
			)}

			{totalPages > 1 && (
				<div className='flex items-center justify-center gap-2'>
					{pageNum > 1 && (
						<Button variant='outline' size='sm' asChild>
							<Link href={`?page=${pageNum - 1}`}>Previous</Link>
						</Button>
					)}
					<span className='text-sm text-gray-500'>
						Page {pageNum} of {totalPages}
					</span>
					{pageNum < totalPages && (
						<Button variant='outline' size='sm' asChild>
							<Link href={`?page=${pageNum + 1}`}>Next</Link>
						</Button>
					)}
				</div>
			)}
		</div>
	);
}

export default page;
