import React from "react";
import InventoryTable from "../components/InventoryTable";
import { withRole } from "@/lib/page-guard";

async function page() {
	return <InventoryTable role='inventory_manager' />;
}

export default withRole(["INVENTORY_MANAGER"], page);