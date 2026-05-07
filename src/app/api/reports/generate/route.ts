import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { generateDailyReport } from "@/lib/ai/generateDailyReport";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const report = await generateDailyReport(userId);
    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Report generation failed";
    console.error("[report/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
