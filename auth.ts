import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prismaClient from "./lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Credentials({
			credentials: {
				username: {
					label: "Username",
					placeholder: "Enter your username address",
				},
				password: {
					type: "password",
					label: "Password",
					placeholder: "Enter your password",
				},
			},
			authorize: async (credentials) => {
				let user = null;

				// logic to verify if the user exists
				user = await getUserFromDb(credentials.username as string, credentials.password as string);

				if (!user) {
					// No user found, so this is their first attempt to login
					// Optionally, this is also the place you could do a user registration
					console.log("No user found with the provided credentials.");
					throw new Error("Invalid credentials.");
				}

				// return user object with their profile data
				return user;
			},
		}),
	],
	callbacks: {
		jwt({ token, user }) {
			if (user) {
				// User is available during sign-in
				token.id = user.id;
				token.role = (user as any).role;
			}
			return token;
		},
		session({ session, token }) {
			session.user.id = token.id as string;
			(session.user as any).role = token.role as string; // Ensure role is included in the session
			return session;
		},
	},
});

async function getUserFromDb(username: string, password: string) {
	const user = await prismaClient.user.findFirst({
		where: {
			username: username,
		},
	});
	if (user && (await bcrypt.compare(password, user.passwordHash))) {
		return {
			id: String(user.id),
			username: user.username,
			name: user.fullName,
			role: user.role,
		};
	}
	return null;
}
