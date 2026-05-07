import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ db: "ok" });
  } catch (err) {
    return NextResponse.json({ db: "error", message: String(err) }, { status: 500 });
  }
}
