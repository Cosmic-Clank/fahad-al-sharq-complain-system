// Authorization helpers for server actions and pages.
//
// Every exported function in a "use server" file is a public POST endpoint, so
// each action must check the caller itself — the role layouts only protect
// page rendering. Always take "who is acting" from these helpers, never from a
// client-supplied id parameter.
import { auth } from "@/auth";
import prismaClient from "./prisma";
import type { Role } from "@/app/generated/prisma";
import { HR_ACCESS_ROLES } from "./hr-roles";

export interface Actor {
	id: number;
	role: Role;
	name: string;
}

/** The logged-in user from the session (role as stored in the JWT), or null. */
export async function getActor(): Promise<Actor | null> {
	const session = await auth();
	const id = Number(session?.user?.id);
	const role = (session?.user as { role?: Role } | undefined)?.role;
	if (!Number.isInteger(id) || id <= 0 || !role) return null;
	return { id, role, name: session?.user?.name ?? "Unknown" };
}

/**
 * The logged-in user if their role is one of `roles`, otherwise null.
 * With `fresh: true` the role is re-read from the database, so a deleted user
 * or a changed role is caught immediately (use for account/permission changes).
 */
export async function requireRole(roles: Role[], opts: { fresh?: boolean } = {}): Promise<Actor | null> {
	const actor = await getActor();
	if (!actor) return null;
	if (opts.fresh) {
		const user = await prismaClient.user.findUnique({ where: { id: actor.id }, select: { role: true, fullName: true } });
		if (!user || !roles.includes(user.role)) return null;
		return { id: actor.id, role: user.role, name: user.fullName };
	}
	return roles.includes(actor.role) ? actor : null;
}

/** Caller allowed to operate the HR module (ADMIN or HR_MANAGER), or null. */
export function requireHrAccess(): Promise<Actor | null> {
	return requireRole(HR_ACCESS_ROLES);
}
