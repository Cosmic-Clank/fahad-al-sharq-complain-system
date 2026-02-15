import React from "react";
import RestockForm from "../../../../components/RestockForm";

async function page({ params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	// If id is "0" or invalid, pass undefined to start with no item selected
	const initialItemId = id && id !== "0" ? id : undefined;
	return <RestockForm initialItemId={initialItemId} />;
}

export default page;
