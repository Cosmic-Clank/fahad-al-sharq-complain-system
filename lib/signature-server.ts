// Server-side validation of drawn signatures (react-signature-canvas PNG data URLs).
import { inflateSync } from "node:zlib";

/** A drawn signature from react-signature-canvas (PNG data URL), capped at ~1MB. */
const SIGNATURE_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/=]{100,1400000}$/;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/**
 * True only for a structurally sound PNG. pdf-lib loops forever on a PNG whose
 * header is fine but whose pixel data is corrupt, which would freeze the server
 * when the leave form PDF is exported — so signatures are fully checked before
 * they are stored: sane dimensions, and the compressed data must inflate to
 * exactly the size the header promises.
 */
export function isValidSignature(dataUrl: string | null | undefined): dataUrl is string {
	if (!dataUrl || !SIGNATURE_PATTERN.test(dataUrl)) return false;
	try {
		const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
		if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_MAGIC)) return false;

		let offset = 8;
		let width = 0;
		let height = 0;
		let bitDepth = 0;
		let channels = 0;
		const idat: Buffer[] = [];
		while (offset + 12 <= buf.length) {
			const length = buf.readUInt32BE(offset);
			const type = buf.toString("ascii", offset + 4, offset + 8);
			if (offset + 12 + length > buf.length) return false;
			const data = buf.subarray(offset + 8, offset + 8 + length);
			if (type === "IHDR") {
				width = data.readUInt32BE(0);
				height = data.readUInt32BE(4);
				bitDepth = data[8];
				channels = PNG_CHANNELS[data[9]] ?? 0;
				if (data[12] !== 0) return false; // interlaced — canvas never produces it
			} else if (type === "IDAT") {
				idat.push(data);
			} else if (type === "IEND") {
				break;
			}
			offset += 12 + length;
		}
		if (!width || !height || width > 4000 || height > 4000 || !channels || ![1, 2, 4, 8, 16].includes(bitDepth) || idat.length === 0) return false;

		const expected = height * (1 + Math.ceil((width * channels * bitDepth) / 8));
		const raw = inflateSync(Buffer.concat(idat), { maxOutputLength: expected + 1 });
		return raw.length === expected;
	} catch {
		return false;
	}
}
