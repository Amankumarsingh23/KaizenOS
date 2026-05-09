import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

const CF_API = "https://codeforces.com/api/contest.list?gym=false";

export interface CFContest {
  id:              number;
  name:            string;
  type:            string;
  phase:           string;
  durationSeconds: number;
  startTimeSeconds: number;
}

// Determine contest division label from name
function divLabel(name: string): string {
  if (/div\.?\s*1\s*\+\s*div\.?\s*2/i.test(name)) return "Div.1+2";
  if (/div\.?\s*1\b/i.test(name)) return "Div.1";
  if (/div\.?\s*2\b/i.test(name)) return "Div.2";
  if (/div\.?\s*3\b/i.test(name)) return "Div.3";
  if (/div\.?\s*4\b/i.test(name)) return "Div.4";
  if (/educational/i.test(name))  return "Educational";
  if (/global/i.test(name))       return "Global";
  return "CF";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch from CF API server-side (no CORS issues)
  let upcoming: CFContest[] = [];
  try {
    const res  = await fetch(CF_API, { next: { revalidate: 300 } }); // cache 5 min
    const json = await res.json();
    if (json.status === "OK") {
      upcoming = (json.result as CFContest[])
        .filter((c) => c.phase === "BEFORE" && c.startTimeSeconds)
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
        .slice(0, 12); // next 12 contests
    }
  } catch {
    return NextResponse.json({ error: "Failed to reach Codeforces API" }, { status: 502 });
  }

  // Load user's reminders so the page can show which ones are set
  const reminders = await db.contestReminder.findMany({
    where: { userId, contestId: { in: upcoming.map((c) => c.id) } },
    select: { contestId: true },
  });
  const reminderSet = new Set(reminders.map((r) => r.contestId));

  return NextResponse.json(
    upcoming.map((c) => ({
      id:            c.id,
      name:          c.name,
      divLabel:      divLabel(c.name),
      type:          c.type,
      startTime:     c.startTimeSeconds * 1000, // ms for JS Date
      durationMin:   Math.round(c.durationSeconds / 60),
      reminderSet:   reminderSet.has(c.id),
    }))
  );
}
