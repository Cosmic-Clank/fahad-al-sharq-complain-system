import type { Language } from "./language";

/**
 * Attendance record labels in both UI languages. Google Translate mistranslates
 * the bare status words (e.g. "PRESENT" → "gift") and can't see Select options
 * or tooltips, so attendance screens render these directly instead. Elements
 * showing them should carry translate="no".
 */
export const ATTENDANCE_TEXT = {
	en: {
		status: { PRESENT: "Present", LATE: "Late", ABSENT: "Absent" } as Record<string, string>,
		chip: { PRESENT: "P", LATE: "L", ABSENT: "A" } as Record<string, string>,
		reason: { SICK: "Sick", ADDITIONAL_WORK: "Additional work", OTHER: "Other" } as Record<string, string>,
		statusOption: { AUTO: "Automatic (from arrival time)", PRESENT: "Present (manual)", LATE: "Late (manual)", ABSENT: "Absent (manual)" },
		reasonOption: { NONE: "No — full day", SICK: "A. Sick", ADDITIONAL_WORK: "B. Additional work", OTHER: "C. Other" },
		otherLeaves: '"Other" leaves',
		earlyLeave: "early leave",
		noEntry: "No entry — click to record",
		willBeSavedAs: "Will be saved as:",
		arrivedAt: (arrive: string, start: string) => ` (arrived ${arrive}, start ${start})`,
		clearEntry: "Clear entry",
		cancel: "Cancel",
		save: "Save",
		saving: "Saving...",
	},
	ar: {
		status: { PRESENT: "حاضر", LATE: "متأخر", ABSENT: "غائب" } as Record<string, string>,
		chip: { PRESENT: "ح", LATE: "م", ABSENT: "غ" } as Record<string, string>,
		reason: { SICK: "مرض", ADDITIONAL_WORK: "عمل إضافي", OTHER: "أخرى" } as Record<string, string>,
		statusOption: { AUTO: "تلقائي (حسب وقت الوصول)", PRESENT: "حاضر (يدوي)", LATE: "متأخر (يدوي)", ABSENT: "غائب (يدوي)" },
		reasonOption: { NONE: "لا — يوم كامل", SICK: "أ. مرض", ADDITIONAL_WORK: "ب. عمل إضافي", OTHER: "ج. أخرى" },
		otherLeaves: 'مغادرات "أخرى"',
		earlyLeave: "مغادرة مبكرة",
		noEntry: "لا يوجد سجل — انقر للتسجيل",
		willBeSavedAs: "سيتم الحفظ كـ:",
		arrivedAt: (arrive: string, start: string) => ` (الوصول ${arrive}، بداية الدوام ${start})`,
		clearEntry: "مسح السجل",
		cancel: "إلغاء",
		save: "حفظ",
		saving: "جارٍ الحفظ...",
	},
} satisfies Record<Language, unknown>;
