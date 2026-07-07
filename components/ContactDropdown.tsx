"use client";

import { Phone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CONTACT_NUMBERS = ["0566068030", "0553665540", "0505446612", "0523744667"];

export default function ContactDropdown() {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button type='button' className='inline-flex items-center gap-1 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-slate-100 cursor-pointer'>
					<Phone className='h-3.5 w-3.5' />
					<span className='hidden sm:inline'>Contact Us</span>
				</button>
			</PopoverTrigger>
			<PopoverContent align='end' className='w-56 p-2'>
				<div className='px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500'>Call us</div>
				<div className='flex flex-col gap-1'>
					{CONTACT_NUMBERS.map((num) => (
						<a key={num} href={`tel:${num}`} className='group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[#1ca5e4]/5'>
							<span className='flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ca5e4]/10 transition group-hover:bg-[#1ca5e4]/20'>
								<Phone className='h-4 w-4 text-[#1ca5e4]' />
							</span>
							<span className='text-sm font-semibold tracking-wide text-slate-800'>{num}</span>
						</a>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
