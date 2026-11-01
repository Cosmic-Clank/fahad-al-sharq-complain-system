import React from "react";
import AddInventoryForm from "../../components/AddInventoryForm";
import { withRole } from "@/lib/page-guard";

async function page() {
	return <AddInventoryForm />;
}

export default withRole(["INVENTORY_MANAGER"], page);