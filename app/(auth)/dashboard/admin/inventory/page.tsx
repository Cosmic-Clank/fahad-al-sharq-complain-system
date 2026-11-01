import React from "react";
import InventoryTable from "../../components/InventoryTable";
import { withRole } from "@/lib/page-guard";

async function page() {
	return <InventoryTable role='admin' />;
}

export default withRole(["ADMIN"], page);