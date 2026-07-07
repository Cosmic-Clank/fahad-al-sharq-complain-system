"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";

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

function getCookieDomainCandidates(hostname: string) {
	const candidates = new Set<string>();
	const parts = hostname.split(".").filter(Boolean);

	candidates.add(hostname);
	candidates.add(`.${hostname}`);

	for (let index = 0; index < parts.length - 1; index++) {
		const domain = parts.slice(index).join(".");
		candidates.add(domain);
		candidates.add(`.${domain}`);
	}

	return Array.from(candidates);
}

function clearGoogtransCookies() {
	const hostname = window.location.hostname;
	const expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
	const clearValue = `googtrans=; ${expires}; max-age=0; path=/; SameSite=Lax`;

	document.cookie = clearValue;

	for (const domain of getCookieDomainCandidates(hostname)) {
		document.cookie = `${clearValue}; domain=${domain}`;
	}
}

const LANGUAGE_LABELS: Record<Language, string> = {
	en: "English",
	ar: "Arabic",
};

export default function LanguageToggle() {
	// null = not yet determined (avoids flash)
	const [language, setLanguage] = useState<Language | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setLanguage(getCurrentLanguage());
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const handlePointerDown = (event: MouseEvent | TouchEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("touchstart", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("touchstart", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	const changeLanguage = (nextLanguage: Language) => {
		setIsOpen(false);
		if (nextLanguage === language) return;

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
			ref={containerRef}
			translate="no"
			style={{ fontFamily: isArabic ? "'Segoe UI', 'Arial', sans-serif" : undefined }}
			className="notranslate fixed top-4 left-1/2 -translate-x-1/2 z-50"
		>
			{/* The whole pill is the trigger, so clicking "Language" opens the menu too */}
			<button
				type="button"
				onClick={() => setIsOpen((open) => !open)}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				aria-label="Language"
				translate="no"
				className="notranslate flex items-center overflow-hidden rounded-full border border-gray-200 bg-white/95 text-sm font-semibold text-gray-800 shadow-lg shadow-black/10 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 cursor-pointer"
			>
				<span className="flex items-center gap-2 px-4 py-2 text-gray-600">
					<Languages className="h-4 w-4" aria-hidden="true" />
					<span>Language</span>
				</span>
				<span className="flex h-10 items-center gap-2 border-l border-gray-200 pl-4 pr-3 text-gray-900">
					{LANGUAGE_LABELS[language]}
					<ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
				</span>
			</button>

			{isOpen && (
				<ul
					role="listbox"
					aria-label="Language options"
					translate="no"
					className="notranslate absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white/95 py-1 shadow-lg shadow-black/10 backdrop-blur"
				>
					{(Object.keys(LANGUAGE_LABELS) as Language[]).map((option) => (
						<li key={option} role="option" aria-selected={language === option}>
							<button
								type="button"
								onClick={() => changeLanguage(option)}
								translate="no"
								className="notranslate flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 cursor-pointer"
							>
								{LANGUAGE_LABELS[option]}
								{language === option && <Check className="h-4 w-4 text-gray-500" aria-hidden="true" />}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
