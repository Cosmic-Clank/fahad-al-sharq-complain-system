"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Option = {
	value: string;
	label: string;
};

interface ComboboxProps {
	options: Option[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function BuildingsCombobox({ options, value, onChange, placeholder, className }: ComboboxProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant='outline' role='combobox' aria-expanded={open} className='justify-between'>
					{value ? options.find((opt) => opt.value === value)?.label : placeholder || "Select..."}
					<ChevronsUpDownIcon className='ml-2 h-4 w-4 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-full p-0'>
				<Command>
					<CommandInput placeholder='Search...' />
					<CommandList>
						<CommandEmpty>No option found.</CommandEmpty>
						<CommandGroup>
							{options.map((opt) => (
								<CommandItem
									key={opt.value}
									value={opt.value}
									onSelect={(currentValue) => {
										onChange(currentValue === value ? "" : currentValue);
										setOpen(false);
									}}>
									<CheckIcon className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
									{opt.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
