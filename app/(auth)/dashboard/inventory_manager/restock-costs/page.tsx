import React from "react";
import RestockCostsReport from "@/app/(auth)/dashboard/components/RestockCostsReport";
import { withRole } from "@/lib/page-guard";

async function page({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
	const sp = await searchParams;
	return <RestockCostsReport filters={{ from: sp.from, to: sp.to }} role='inventory_manager' />;
}

export default withRole(["INVENTORY_MANAGER"], page);
