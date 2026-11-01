import React from "react";
import ReportGenerator from "../../components/ReportGenerator";
import { withRole } from "@/lib/page-guard";

function page() {
	return <ReportGenerator />;
}

export default withRole(["EMPLOYEE"], page);