export type Language = "en" | "ar";

export const LANGUAGE_STORAGE_KEY = "preferred-language";

/** The googtrans cookie value. There can be two (host-only + domain), so take the first match. */
export function getGoogtransCookie(): string | null {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
	return match ? match[1] : null;
}

function getStoredLanguage(): Language | null {
	if (typeof window === "undefined") return null;
	try {
		const language = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
		return language === "ar" || language === "en" ? language : null;
	} catch {
		return null;
	}
}

/** The language picked in the LanguageToggle. Always "en" on the server. */
export function getCurrentLanguage(): Language {
	if (typeof window === "undefined") return "en";
	const storedLanguage = getStoredLanguage();
	if (storedLanguage) return storedLanguage;
	return getGoogtransCookie()?.endsWith("/ar") ? "ar" : "en";
}
