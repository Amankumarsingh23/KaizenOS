import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const now    = new Date();
  const month  = now.getMonth() + 1;
  const year   = now.getFullYear();

  const targets = await db.target.findMany({
    where: { userId, month, year },
    orderBy: { category: "asc" },
  });

  return NextResponse.json({ targets, month, year });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { targets } = await req.json();
  if (!Array.isArray(targets)) {
    return NextResponse.json({ error: "targets must be an array" }, { status: 400 });
  }

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const results = await Promise.all(
    targets.map((t: { category: string; targetValue: number; unit: string }) =>
      db.target.upsert({
        where: { userId_month_year_category: { userId, month, year, category: t.category as never } },
        update: { targetValue: Number(t.targetValue), unit: t.unit },
        create: {
          userId, month, year,
          category:     t.category as never,
          targetValue:  Number(t.targetValue),
          currentValue: 0,
          unit:         t.unit,
        },
      })
    )
  );

  return NextResponse.json(results);
}
