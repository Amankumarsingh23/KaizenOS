import type { Session } from "next-auth";
import { db } from "./db";

/**
 * Resolves the Prisma User record for the current session.
 * Creates the user on their very first API request (lazy registration).
 * Returns null when the session is missing or has no email.
 */
export async function getUserId(session: Session | null): Promise<string | null> {
  const email = session?.user?.email;
  if (!email) return null;

  const user = await db.user.upsert({
    where:  { email },
    update: { name: session.user?.name ?? null, image: session.user?.image ?? null },
    create: { email, name: session.user?.name ?? null, image: session.user?.image ?? null },
    select: { id: true },
  });

  return user.id;
}
