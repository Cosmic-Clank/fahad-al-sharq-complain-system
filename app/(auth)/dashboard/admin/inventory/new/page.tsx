import React from "react";
import AddInventoryForm from "../../../components/AddInventoryForm";
import { withRole } from "@/lib/page-guard";

async function page() {
	return <AddInventoryForm role='admin' />;
}

export default withRole(["ADMIN"], page);