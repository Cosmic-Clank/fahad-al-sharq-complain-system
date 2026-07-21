"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { cn } from "@/lib/utils";

const TABS = [
	{ label: "Overview", segment: "" },
	{ label: "HR Profile", segment: "hr" },
	{ label: "Documents", segment: "documents" },
	{ label: "Attendance", segment: "attendance" },
	{ label: "Tickets", segment: "tickets" },
	{ label: "Penalties & Bonuses", segment: "penalties" },
	{ label: "Handovers", segment: "handovers" },
	{ label: "Payslips", segment: "payslips" },
	{ label: "Activity", segment: "activity" },
];

export default function ProfileTabs({ employeeId, basePath = "/dashboard/admin/employees" }: { employeeId: number; basePath?: string }) {
	const pathname = usePathname();
	const base = `${basePath}/${employeeId}`;

	return (
		<nav className='overflow-x-auto'>
			<div className='flex gap-1 border-b border-gray-200 min-w-max'>
				{TABS.map((tab) => {
					const href = tab.segment ? `${base}/${tab.segment}` : base;
					const isActive = tab.segment ? pathname.startsWith(href) : pathname === base;
					return (
						<Link
							key={tab.label}
							href={href}
							className={cn(
								"px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
								isActive ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
							)}>
							{tab.label}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
