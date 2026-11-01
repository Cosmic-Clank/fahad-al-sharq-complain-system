// Page-level role guard.
//
// The role layouts are NOT enough on their own: Next.js doesn't re-render a
// shared layout on client navigation, and a crafted RSC request can ask for
// just the page segment. So every dashboard page checks the role itself.
import React from "react";
import type { Role } from "@/app/generated/prisma";
import NotAuthorized from "@/app/(auth)/dashboard/components/NotAuthorized";
import { requireRole } from "./authz";

/** Wraps a page (or layout) so it renders only for the given roles, otherwise the Access Denied screen. */
export function withRole<P extends object>(roles: Role[], Page: (props: P) => React.ReactNode | Promise<React.ReactNode>) {
	return async function RoleGuarded(props: P) {
		if (!(await requireRole(roles))) return <NotAuthorized />;
		return <Page {...props} />;
	};
}
