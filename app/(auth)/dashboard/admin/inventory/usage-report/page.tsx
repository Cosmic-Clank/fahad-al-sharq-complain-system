import React from "react";
import UsageByBuildingReport from "@/app/(auth)/dashboard/components/UsageByBuildingReport";

async function page({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; building?: string }> }) {
	const sp = await searchParams;
	return <UsageByBuildingReport filters={{ from: sp.from, to: sp.to, building: sp.building }} />;
}

export default page;
