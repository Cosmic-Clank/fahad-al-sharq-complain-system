import { auth } from "@/auth";
import React, { ReactNode } from "react";
import NotAuthorized from "../components/NotAuthorized";

interface EmployeeLayoutProps {
	children: ReactNode;
}

const EmployeeLayout: React.FC<EmployeeLayoutProps> = async ({ children }) => {
	const session = await auth();

	if (!session || !session.user || !session.user.id) {
		return <NotAuthorized />;
	}

	const role = (session.user as any).role;

	if (!role || role !== "EMPLOYEE") {
		return <NotAuthorized />;
	}

	return (
		<div className='employee-layout'>
			<header className='employee-header'>
				<h1>Employee Dashboard LAYOUT</h1>
				{/* Add navigation or user info here */}
			</header>
			<main className='employee-content'>{children}</main>
			<footer className='employee-footer'>&copy; {new Date().getFullYear()} Fahad Al Sharq Complain System</footer>
		</div>
	);
};

export default EmployeeLayout;
