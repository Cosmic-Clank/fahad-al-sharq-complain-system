import { auth } from "@/auth";
import React from "react";
import LoginForm from "./components/LoginForm";
import { redirect } from "next/navigation";

async function page() {
	const session = await auth();
	if (!session || !session.user || !session.user.id || !session.user.name) {
		return <LoginForm />;
	}
	if ((session.user as any).role === "EMPLOYEE") {
		return redirect("/dashboard/employee");
	}
	if ((session.user as any).role === "ADMIN") {
		return redirect("/dashboard/admin");
	}
	return redirect("/");
}

export default page;
