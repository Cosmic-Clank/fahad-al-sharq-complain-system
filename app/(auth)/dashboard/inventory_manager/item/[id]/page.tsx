import React from "react";
import InventoryDetailPage from "../../../components/InventoryDetailPage";

async function page({ params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	return <InventoryDetailPage id={id} />;
}

export default page;
