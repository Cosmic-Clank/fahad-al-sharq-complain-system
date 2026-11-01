import React from "react";
import InventoryDetailPage from "../../../components/InventoryDetailPage";
import { withRole } from "@/lib/page-guard";

async function page({ params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	return <InventoryDetailPage id={id} />;
}

export default withRole(["INVENTORY_MANAGER"], page);