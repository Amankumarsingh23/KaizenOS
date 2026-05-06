import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID     ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Runs on first sign-in: create or update the user in our DB
      if (account && user) {
        const dbUser = await db.user.upsert({
          where:  { email: user.email! },
          update: { name: user.name ?? null, image: user.image ?? null },
          create: { email: user.email!, name: user.name ?? null, image: user.image ?? null },
        });
        token.id = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
