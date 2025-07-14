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
		setTimeout(() => {
			redirect("/dashboard/employee");
		}, 1000);
		return <div className='text-center'>Redirecting to Employee Dashboard...</div>;
	}
	if ((session.user as any).role === "ADMIN") {
		setTimeout(() => {
			redirect("/dashboard/admin");
		}, 1000);
		return <div className='text-center'>Redirecting to Admin Dashboard...</div>;
	}
	redirect("/");
}

export default page;
