"use client";

import { useEffect, useState } from "react";
import { getCurrentLanguage, type Language } from "@/lib/language";

/**
 * Current UI language. Starts as "en" so server and client markup match,
 * then switches after mount. Elements whose text depends on this should carry
 * translate="no" so Google Translate doesn't rewrite nodes React manages.
 */
export function useLanguage(): Language {
	const [language, setLanguage] = useState<Language>("en");

	useEffect(() => {
		setLanguage(getCurrentLanguage());
	}, []);

	return language;
}
