import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { parseYourHourText } from "@/lib/parsePhonePdf";
import { startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") ?? "";

  // ── PDF upload ─────────────────────────────────────────────────────────────
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (!file.name.endsWith(".pdf")) return NextResponse.json({ error: "Must be a PDF" }, { status: 400 });

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let text = "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfMod   = await import("pdf-parse") as any;
      const pdfParse = pdfMod.default ?? pdfMod;
      const result   = await pdfParse(buffer);
      text = result.text;
    } catch {
      return NextResponse.json({ error: "Could not read PDF — try manual entry" }, { status: 422 });
    }

    const parsed = parseYourHourText(text);
    if (!parsed.totalMins && !parsed.unlockCount) {
      return NextResponse.json({ error: "Could not extract data — check it is a YourHour PDF" }, { status: 422 });
    }

    return NextResponse.json({ parsed: { ...parsed, date: parsed.date.toISOString() }, preview: true });
  }

  // ── Save (after user confirms preview, or manual entry) ────────────────────
  const body = await req.json();
  const { date, totalMins, unlockCount, topApps, categories } = body;
  if (!date || totalMins == null || unlockCount == null) {
    return NextResponse.json({ error: "date, totalMins, unlockCount required" }, { status: 400 });
  }

  const day = startOfDay(new Date(date));
  const log = await db.phoneUsageLog.upsert({
    where:  { userId_date: { userId, date: day } },
    update: { totalMins, unlockCount, topApps: JSON.stringify(topApps ?? []), categories: JSON.stringify(categories ?? []) },
    create: { userId, date: day, totalMins, unlockCount, topApps: JSON.stringify(topApps ?? []), categories: JSON.stringify(categories ?? []) },
  });

  return NextResponse.json(log, { status: 201 });
}
