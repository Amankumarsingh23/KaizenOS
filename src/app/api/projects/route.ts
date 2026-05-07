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

  const projects = await db.project.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      milestones: {
        orderBy: { displayOrder: "asc" },
        select: { id: true, status: true, phase: true, targetDate: true },
      },
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const project = await db.project.create({
    data: {
      userId,
      name:        name.trim(),
      description: (description ?? "").trim(),
      color:       color ?? "#6B8F71",
    },
  });

  return NextResponse.json(project, { status: 201 });
}
