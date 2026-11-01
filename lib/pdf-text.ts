// Text helpers for pdf-lib's standard fonts (Helvetica), which only encode
// WinAnsi (Windows-1252): ASCII, Latin-1 and a few extras. Anything else
// (e.g. Arabic) makes drawText throw, so it is replaced with "?".

/** Windows-1252 characters outside Latin-1 that Helvetica can draw (smart quotes, €, …, dashes, bullet). */
const WIN_ANSI_EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

/** Makes text safe for Helvetica: tabs/newlines become spaces, unsupported characters become "?". */
export function toWinAnsi(s: string | null | undefined): string {
	let out = "";
	for (const ch of (s ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ")) {
		const c = ch.codePointAt(0)!;
		const ok = (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRAS.includes(ch);
		out += ok ? ch : "?";
	}
	return out;
}
