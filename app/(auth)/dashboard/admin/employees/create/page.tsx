// app/employees/new/page.tsx
import React from "react";
import EmployeeForm from "./components/EmployeeForm"; // Import the new form component

function NewEmployeePage() {
	return (
		<div className='flex items-center justify-center min-h-screen bg-gray-100 p-4'>
			<EmployeeForm />
		</div>
	);
}

export default NewEmployeePage;
