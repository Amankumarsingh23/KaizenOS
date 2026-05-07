import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GithubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID     ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  pages:   { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, user is populated with GitHub profile
      if (user?.email) token.id = user.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // session.user.id = email (used by getUserId to find the DB user)
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
