import { auth } from "@/auth";
import React from "react";
import NotAuthorized from "./components/NotAuthorized";
import prismaClient from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function page() {
	const session = await auth();
	if (!session || !session.user || !session.user.id || !(session.user as any).role) {
		return <NotAuthorized />;
	}

	const role = (session.user as any).role;

	if (!role) {
		return <NotAuthorized />;
	}

	if (role === "ADMIN") {
		// Use the correct Role enum value, e.g., 'ADMIN'
		return redirect("/dashboard/admin");
	}
	if (role === "EMPLOYEE") {
		// Use the correct Role enum value, e.g., 'EMPLOYEE'
		return redirect("/dashboard/employee");
	}
	return <NotAuthorized />;
}
