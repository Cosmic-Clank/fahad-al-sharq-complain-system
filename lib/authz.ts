// Authorization helpers for server actions and pages.
//
// Every exported function in a "use server" file is a public POST endpoint, so
// each action must check the caller itself — the role layouts only protect
// page rendering. Always take "who is acting" from these helpers, never from a
// client-supplied id parameter.
import { cache } from "react";
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

/** The user's current role and name from the database, looked up once per request. */
const currentUserRecord = cache((id: number) => prismaClient.user.findUnique({ where: { id }, select: { role: true, fullName: true } }));

/**
 * The logged-in user if their role is one of `roles`, otherwise null.
 * The role is read from the database, not the session token (which lives 30 days),
 * so a deleted user or a changed role takes effect immediately.
 */
export async function requireRole(roles: Role[]): Promise<Actor | null> {
	const actor = await getActor();
	if (!actor) return null;
	const user = await currentUserRecord(actor.id);
	if (!user || !roles.includes(user.role)) return null;
	return { id: actor.id, role: user.role, name: user.fullName };
}

/** Caller allowed to operate the HR module (ADMIN or HR_MANAGER), or null. */
export function requireHrAccess(): Promise<Actor | null> {
	return requireRole(HR_ACCESS_ROLES);
}
