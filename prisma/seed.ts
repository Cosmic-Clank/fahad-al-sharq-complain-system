import { PrismaClient, Prisma } from "../app/generated/prisma";

const prisma = new PrismaClient();

const userData: Prisma.UserCreateInput[] = [
	{
		fullName: "Admin",
		email: "admin@prisma.io",
		passwordHash: "$2a$12$oZveZ4AsulkcbuwbDRx6QuO37hNxRZURqgTQGFSHosFjShdPMpdbe",
		role: "ADMIN",
	},
	{
		fullName: "User",
		email: "user@prisma.io",
		passwordHash: "$2a$12$oZveZ4AsulkcbuwbDRx6QuO37hNxRZURqgTQGFSHosFjShdPMpdbe",
		role: "EMPLOYEE",
	},
];

export async function main() {
	for (const u of userData) {
		await prisma.user.create({ data: u });
	}
}

main();
