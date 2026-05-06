import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays } from "date-fns";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, userId },
    include: {
      milestones: { orderBy: { displayOrder: "asc" } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Recent PROJECT_WORK sessions
  const recentSessions = await db.studySession.findMany({
    where: { userId, category: "PROJECT_WORK", startTime: { gte: subDays(new Date(), 30) } },
    orderBy: { startTime: "desc" },
    take: 10,
  });

  return NextResponse.json({ ...project, recentSessions });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const body = await req.json();
  const project = await db.project.findFirst({ where: { id, userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.project.update({
    where: { id },
    data: {
      name:        body.name        ?? project.name,
      description: body.description ?? project.description,
      color:       body.color       ?? project.color,
    },
  });

  return NextResponse.json(updated);
}
