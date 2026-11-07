import React from "react";
import RestockCostsReport from "@/app/(auth)/dashboard/components/RestockCostsReport";
import { withRole } from "@/lib/page-guard";

async function page({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
	const sp = await searchParams;
	return <RestockCostsReport filters={{ from: sp.from, to: sp.to }} role='admin' />;
}

export default withRole(["ADMIN"], page);
