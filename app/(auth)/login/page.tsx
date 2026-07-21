import { auth } from "@/auth";
import React from "react";
import LoginForm from "./components/LoginForm";
import { redirect } from "next/navigation";
import Link from "next/link";

async function page() {
	const session = await auth();
	if (!session || !session.user || !session.user.id || !session.user.name) {
		return <LoginForm />;
	}
	if ((session.user as any).role === "EMPLOYEE") {
		// Reload the page after redirecting
		redirect("/dashboard/employee");
		// return <div class
	}
	if ((session.user as any).role === "ADMIN") {
		// Reload the page after redirecting
		redirect("/dashboard/admin");
	}
	if ((session.user as any).role === "INVENTORY_MANAGER") {
		redirect("/dashboard/inventory_manager");
	}
	if ((session.user as any).role === "HR_MANAGER") {
		redirect("/dashboard/hr_manager");
	}
	// Session exists but role is unrecognized (e.g. stale token) — let the user log in again
	return <LoginForm />;
}

export default page;
