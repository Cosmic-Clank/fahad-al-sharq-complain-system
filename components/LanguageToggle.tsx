"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Languages } from "lucide-react";

type Language = "en" | "ar";

const LANGUAGE_STORAGE_KEY = "preferred-language";

function getGoogtransCookie(): string | null {
	if (typeof document === "undefined") return null;
	const value = `; ${document.cookie}`;
	const parts = value.split("; googtrans=");
	if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
	return null;
}

function getStoredLanguage(): Language | null {
	if (typeof window === "undefined") return null;
	const language = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
	return language === "ar" || language === "en" ? language : null;
}

function getCurrentLanguage(): Language {
	const storedLanguage = getStoredLanguage();
	if (storedLanguage) return storedLanguage;
	return getGoogtransCookie()?.endsWith("/ar") ? "ar" : "en";
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
	const [language, setLanguage] = useState<Language | null>(null);

	useEffect(() => {
		setLanguage(getCurrentLanguage());
	}, []);

	const changeLanguage = (nextLanguage: Language) => {
		window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
		setLanguage(nextLanguage);

		if (nextLanguage === "ar") {
			setArabicCookies();
		} else {
			clearGoogtransCookies();
		}
		window.location.reload();
	};

	// Render nothing until we've read the cookie - prevents wrong-label flash
	if (language === null) return null;

	const isArabic = language === "ar";

	return (
		<div
			translate="no"
			style={{ fontFamily: isArabic ? "'Segoe UI', 'Arial', sans-serif" : undefined }}
			className="notranslate fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center overflow-hidden rounded-full border border-gray-200 bg-white/95 text-sm font-semibold text-gray-800 shadow-lg shadow-black/10 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-xl"
		>
			<label htmlFor="language-select" className="notranslate flex items-center gap-2 px-4 py-2 text-gray-600">
				<Languages className="h-4 w-4" aria-hidden="true" />
				<span>Language</span>
			</label>
			<div className="relative border-l border-gray-200">
				<select
					id="language-select"
					value={language}
					onChange={(event) => changeLanguage(event.target.value as Language)}
					aria-label="Language"
					translate="no"
					className="notranslate h-10 appearance-none bg-transparent py-0 pl-4 pr-9 text-sm font-semibold text-gray-900 outline-none transition-colors cursor-pointer hover:bg-gray-50 focus:bg-gray-50 focus:ring-2 focus:ring-inset focus:ring-gray-300"
				>
					<option value="en" translate="no">
						English
					</option>
					<option value="ar" translate="no">
						Arabic
					</option>
				</select>
				<ChevronDown
					className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
					aria-hidden="true"
				/>
			</div>
		</div>
	);
}
