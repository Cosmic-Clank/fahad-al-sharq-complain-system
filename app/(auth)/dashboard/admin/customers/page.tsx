import React from "react";
import prismaClient from "@/lib/prisma";
import CustomersTable from "./components/CustomersTable";

async function page() {
	type RawDataRow = {
		buildingName: string;
		apartmentNumber: string;
		complaintCount: number | bigint;
		latestComplaintAt: Date | string;
		customerNames: string[];
		customerEmails: string[];
		customerPhones: string[];
		customerAddresses: string[];
	};

	const rawData = await prismaClient.$queryRaw<RawDataRow[]>`
  SELECT
    "buildingName",
    "apartmentNumber",
    COUNT(*) as "complaintCount",
    MAX("createdAt") as "latestComplaintAt",
    ARRAY_AGG("customerName" ORDER BY "createdAt" DESC) AS "customerNames",
    ARRAY_AGG("customerEmail" ORDER BY "createdAt" DESC) AS "customerEmails",
    ARRAY_AGG("customerPhone" ORDER BY "createdAt" DESC) AS "customerPhones",
    ARRAY_AGG("customerAddress" ORDER BY "createdAt" DESC) AS "customerAddresses"
  FROM "Complaint"
  GROUP BY "buildingName", "apartmentNumber"
  ORDER BY "latestComplaintAt" DESC;
`;

	// Convert BigInt and other unsupported types
	const data = rawData.map((row) => ({
		...row,
		complaintCount: typeof row.complaintCount === "bigint" ? Number(row.complaintCount) : row.complaintCount,
		customerName: row.customerNames[0],
		customerEmail: row.customerEmails[0],
		customerPhone: row.customerPhones[0],
		customerAddress: row.customerAddresses[0],
		latestComplaintAt: row.latestComplaintAt instanceof Date ? row.latestComplaintAt.toISOString() : row.latestComplaintAt,
	}));

	return <CustomersTable data={data} role='admin' currentUser={{ fullName: "Admin User", role: "admin", username: "admin" }} />;
}

export default page;
