import React from "react";
import prismaClient from "@/lib/prisma";
import DocumentsSection from "./components/DocumentsSection";

async function page({ params }: { params: Promise<{ slug: string }> }) {
	const slug = (await params).slug;
	const userId = Number(slug);

	const documents = await prismaClient.employeeDocument.findMany({
		where: { userId },
		orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
		select: {
			id: true,
			type: true,
			title: true,
			documentNumber: true,
			fileUrl: true,
			expiryDate: true,
			notes: true,
		},
	});

	return <DocumentsSection userId={userId} documents={documents} />;
}

export default page;
