import type { Role } from "@/app/generated/prisma";

/** Roles that count as staff for HR purposes (attendance, documents, payroll, …). */
export const HR_STAFF_ROLES: Role[] = ["EMPLOYEE", "INVENTORY_MANAGER", "HR_MANAGER"];

/** Roles allowed to operate the HR module. */
export const HR_ACCESS_ROLES: Role[] = ["ADMIN", "HR_MANAGER"];

export function canAccessHr(role: string | undefined | null): boolean {
	return role === "ADMIN" || role === "HR_MANAGER";
}
