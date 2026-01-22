"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar: React.FC = () => {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

	return (
		<nav className='bg-white shadow-sm dark:bg-gray-900 sticky top-0 z-50'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex justify-between items-center h-16'>
					{/* Left: Company Name */}
					<div className='flex-shrink-0'>
						<Link href='/' className='text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500'>
							Fahad Al Sharq
						</Link>
					</div>

					{/* Right: Desktop Sign In Button */}
					<div className='hidden md:flex items-center'>
						<span className='mr-2 font-medium'>Not a customer?</span>
						<Link href='/login'>
							<Button className='hover:cursor-pointer '>Sign In</Button>
						</Link>
					</div>

					{/* Mobile Menu Button */}
					<div className='md:hidden flex items-center'>
						<button onClick={toggleMobileMenu} className='text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-teal-500 transition-colors'>
							{isMobileMenuOpen ? <X className='h-6 w-6' /> : <Menu className='h-6 w-6' />}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Menu */}
			{isMobileMenuOpen && (
				<div className='md:hidden bg-white dark:bg-gray-900 px-4 pt-2 pb-4 flex flex-col gap-4'>
					<span className='font-medium'>Not a customer?</span>

					<Link href='/login'>
						<Button className='w-full '>Sign In</Button>
					</Link>
				</div>
			)}
		</nav>
	);
};

export default Navbar;
