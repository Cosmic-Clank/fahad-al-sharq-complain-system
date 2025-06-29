import { PrismaClient, Prisma } from "../app/generated/prisma";

const prisma = new PrismaClient();

const userData: Prisma.UserCreateInput[] = [
	{
		fullName: "Admin",
		username: "admin",
		passwordHash: "$2a$12$oZveZ4AsulkcbuwbDRx6QuO37hNxRZURqgTQGFSHosFjShdPMpdbe",
		role: "ADMIN",
	},
	{
		fullName: "User",
		username: "user",
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
