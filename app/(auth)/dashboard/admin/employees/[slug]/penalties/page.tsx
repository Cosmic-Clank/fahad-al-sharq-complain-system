import React from "react";

async function page({ params }: { params: Promise<{ slug: string }> }) {
	const slug = (await params).slug;
	return <div className='text-gray-500 text-sm p-4'>Coming soon. (employee #{slug})</div>;
}

export default page;
