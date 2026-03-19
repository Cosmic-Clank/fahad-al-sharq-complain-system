"use client";

import { useEffect, useState } from "react";

function getCookie(name: string) {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop()?.split(";").shift();
	return null;
}

export default function LanguageToggle() {
	const [isArabic, setIsArabic] = useState(false);

	useEffect(() => {
		setIsArabic(getCookie("googtrans") === "/en/ar");
	}, []);

	const toggle = () => {
		const hostname = window.location.hostname;
		if (isArabic) {
			document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
			document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname}`;
		} else {
			document.cookie = "googtrans=/en/ar; path=/";
			document.cookie = `googtrans=/en/ar; path=/; domain=${hostname}`;
		}
		window.location.reload();
	};

	return (
		<button
			onClick={toggle}
			className='fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50 transition-all cursor-pointer'>
			{isArabic ? "English" : "عربي"}
		</button>
	);
}
