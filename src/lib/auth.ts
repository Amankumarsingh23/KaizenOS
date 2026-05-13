import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // NO adapter — JWT strategy handles sessions without DB
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
      if (user?.email) token.id = user.email;
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
