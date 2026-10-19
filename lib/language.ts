export type Language = "en" | "ar";

export const LANGUAGE_STORAGE_KEY = "preferred-language";

export function getGoogtransCookie(): string | null {
	if (typeof document === "undefined") return null;
	const value = `; ${document.cookie}`;
	const parts = value.split("; googtrans=");
	if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
	return null;
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
