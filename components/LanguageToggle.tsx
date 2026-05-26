"use client";

import { useEffect, useState } from "react";

function getGoogtransCookie(): string | null {
	if (typeof document === "undefined") return null;
	const value = `; ${document.cookie}`;
	const parts = value.split("; googtrans=");
	if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
	return null;
}

function setArabicCookies() {
	const hostname = window.location.hostname;
	document.cookie = "googtrans=/en/ar; path=/; SameSite=Lax";
	document.cookie = `googtrans=/en/ar; path=/; domain=${hostname}; SameSite=Lax`;
}

function clearGoogtransCookies() {
	const hostname = window.location.hostname;
	const past = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
	document.cookie = `googtrans=; ${past}; path=/; SameSite=Lax`;
	document.cookie = `googtrans=; ${past}; path=/; domain=${hostname}; SameSite=Lax`;
	// also clear any subdomain cookie that Google may have set
	document.cookie = `googtrans=; ${past}; path=/; domain=.${hostname}; SameSite=Lax`;
}

export default function LanguageToggle() {
	// null = not yet determined (avoids flash)
	const [isArabic, setIsArabic] = useState<boolean | null>(null);

	useEffect(() => {
		setIsArabic(getGoogtransCookie() === "/en/ar");
	}, []);

	const toggle = () => {
		if (isArabic) {
			clearGoogtransCookies();
		} else {
			setArabicCookies();
		}
		window.location.reload();
	};

	// Render nothing until we've read the cookie — prevents wrong-label flash
	if (isArabic === null) return null;

	return (
		<button
			onClick={toggle}
			aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}
			style={{ fontFamily: isArabic ? "'Segoe UI', 'Arial', sans-serif" : undefined }}
			className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all cursor-pointer select-none"
		>
			<span className="text-base leading-none">{isArabic ? "🇬🇧" : "🇦🇪"}</span>
			<span>{isArabic ? "English" : "عربي"}</span>
		</button>
	);
}
