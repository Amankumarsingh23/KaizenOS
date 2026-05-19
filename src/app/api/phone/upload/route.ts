import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";
import { parseYourHourText } from "@/lib/parsePhonePdf";
import { startOfDay } from "date-fns";

/** Extract text from a PDF buffer using pdf-parse's internal lib (avoids test-file issue) */
async function extractPdfText(buffer: Buffer): Promise<string> {
  // Try the internal lib path first — avoids pdf-parse's problematic test file access
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const result   = await pdfParse(buffer);
    return result.text ?? "";
  } catch { /* fall through */ }

  // Fallback: try the normal import
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod      = await import("pdf-parse") as any;
    const pdfParse = mod.default ?? mod;
    const result   = await pdfParse(buffer);
    return result.text ?? "";
  } catch { /* fall through */ }

  return "";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") ?? "";

  // ── PDF binary upload ───────────────────────────────────────────────────────
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const text   = await extractPdfText(buffer);

    if (!text.trim()) {
      return NextResponse.json({ error: "pdf_extract_failed" }, { status: 422 });
    }

    const parsed = parseYourHourText(text);
    if (!parsed.totalMins && !parsed.unlockCount) {
      return NextResponse.json({ error: "not_yourhour_pdf" }, { status: 422 });
    }

    return NextResponse.json({ parsed: { ...parsed, date: parsed.date.toISOString() }, preview: true });
  }

  // ── Paste-text path (user copies text from PDF viewer) ─────────────────────
  if (ct.includes("application/json")) {
    const body = await req.json();

    // If raw pasted text is provided, parse it first
    if (body.rawText) {
      const parsed = parseYourHourText(body.rawText);
      if (!parsed.totalMins && !parsed.unlockCount) {
        return NextResponse.json({ error: "Could not find YourHour data in pasted text" }, { status: 422 });
      }
      return NextResponse.json({ parsed: { ...parsed, date: parsed.date.toISOString() }, preview: true });
    }

    // Otherwise save confirmed data
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

  return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
}
