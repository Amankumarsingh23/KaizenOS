import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";

const devCredentialsProvider = CredentialsProvider({
  id: "credentials",
  name: "Dev Login",
  credentials: {
    email: { label: "Email", type: "email", placeholder: "you@example.com" },
  },
  async authorize(credentials) {
    if (!credentials?.email) return null;
    const user = await db.user.upsert({
      where: { email: credentials.email },
      update: {},
      create: {
        email: credentials.email,
        name: credentials.email.split("@")[0],
      },
    });
    return { id: user.id, email: user.email, name: user.name, image: user.image };
  },
});

export const authOptions: NextAuthOptions = {
  debug: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db as any),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    ...(process.env.NODE_ENV === "development" ? [devCredentialsProvider] : []),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
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
