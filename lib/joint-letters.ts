// Joint letters: official letters signed jointly by the employee and the
// company. Pure helpers (labels + editable templates), shared client/server.

export type JointLetterTypeValue = "WARNING" | "PENALTY" | "NOTICE";

export const JOINT_LETTER_TYPE_LABELS: Record<string, string> = {
	WARNING: "Warning Letter",
	PENALTY: "Penalty Letter",
	NOTICE: "Notice",
};

export const JOINT_LETTER_TYPE_STYLES: Record<string, string> = {
	WARNING: "bg-amber-100 text-amber-800",
	PENALTY: "bg-red-100 text-red-800",
	NOTICE: "bg-blue-100 text-blue-800",
};

export const MAX_SUBJECT = 150;
export const MAX_BODY = 4000;

export const PENALTY_TYPE_LABELS: Record<string, string> = {
	SALARY_DEDUCTION: "Salary deduction",
	LEAVE_SALARY_DEDUCTION: "Leave salary deduction",
	TICKET_REMOVAL: "Ticket removal",
};

export interface LetterPenalty {
	type: string;
	amount: number | null;
	effectiveMonth: string;
	details: string | null;
}

/** One-line description of a penalty, e.g. "Salary deduction of AED 200.00 (payslip 2026-10)". */
export function describePenalty(p: LetterPenalty): string {
	const label = PENALTY_TYPE_LABELS[p.type] ?? p.type;
	const amount = p.amount !== null ? ` of AED ${p.amount.toFixed(2)}` : "";
	return `${label}${amount} (payslip ${p.effectiveMonth})${p.details ? ` — ${p.details}` : ""}`;
}

/** Starting subject + body for a new letter; the admin edits them before saving. */
export function letterTemplate(type: string, employeeName: string, penalty: LetterPenalty | null): { subject: string; body: string } {
	const closing = "By signing below, both parties confirm that this letter has been read, understood and received.";
	switch (type) {
		case "WARNING":
			return {
				subject: "Official warning",
				body: `Dear ${employeeName},\n\nThis letter is an official warning regarding [describe the incident, with date and place].\n\nThis behaviour is against company rules. You are expected to [state the expected behaviour] from now on. If it happens again, further disciplinary action may be taken, including salary deduction.\n\n${closing}`,
			};
		case "PENALTY":
			return {
				subject: "Penalty notification",
				body: `Dear ${employeeName},\n\nFollowing [describe the incident, with date], the company has applied the following penalty:\n${penalty ? describePenalty(penalty) : "[penalty details]"}.\n\nPlease make sure this does not happen again. Repeated violations may lead to stronger disciplinary action.\n\n${closing}`,
			};
		default:
			return {
				subject: "Notice",
				body: `Dear ${employeeName},\n\n[Write the notice here.]\n\n${closing}`,
			};
	}
}
