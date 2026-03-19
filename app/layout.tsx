import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import LanguageToggle from "@/components/LanguageToggle";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Fahad Al Sharq - Complaint System",
	description: "A complaint system for managing and resolving complaints efficiently for Fahad Al Sharq.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en' suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
				{children}
				<Toaster />
				<div id="google_translate_element" style={{ display: "none" }} />
				<LanguageToggle />
				<Script strategy="afterInteractive" id="google-translate-init">{`
					function googleTranslateElementInit() {
						new google.translate.TranslateElement({
							pageLanguage: 'en',
							includedLanguages: 'ar',
							layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
							autoDisplay: false,
						}, 'google_translate_element');
					}
				`}</Script>
				<Script strategy="afterInteractive" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" />
			</body>
		</html>
	);
}
