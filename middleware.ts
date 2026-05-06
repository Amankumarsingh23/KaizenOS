import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * Match everything except:
     * - /login
     * - /api/auth/** (NextAuth endpoints)
     * - /_next/static, /_next/image (Next.js internals)
     * - /favicon.ico, image files
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|svg|ico)$).*)",
  ],
};
