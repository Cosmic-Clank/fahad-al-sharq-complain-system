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
	redirect("/");
}

export default page;
