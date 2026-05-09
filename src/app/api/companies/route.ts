import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companies = await db.company.findMany({
    where: { userId },
    include: { rounds: { orderBy: { createdAt: "asc" } } },
    orderBy: { appliedDate: "desc" },
  });

  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, role, source, appliedDate, ctc, notes } = await req.json();
  if (!name?.trim() || !role?.trim() || !appliedDate) {
    return NextResponse.json({ error: "name, role, appliedDate required" }, { status: 400 });
  }

  const company = await db.company.create({
    data: {
      userId,
      name: name.trim(),
      role: role.trim(),
      source: source?.trim() ?? null,
      appliedDate: new Date(appliedDate),
      ctc: ctc?.trim() ?? null,
      notes: notes?.trim() ?? null,
    },
    include: { rounds: true },
  });

  return NextResponse.json(company, { status: 201 });
}
