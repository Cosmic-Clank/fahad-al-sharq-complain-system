// app/complaint/[slug]/page.tsx
// This is a Server Component by default in Next.js App Router
import React from "react";
import ComplaintDetailPage from "./components/EmployeeDetails";

// This is your Server Component that fetches data
async function page({ params }: { params: { slug: string } }) {
	const slug = (await params).slug;
	return <ComplaintDetailPage slug={slug} />;
}

export default page;
