import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const project = await db.project.findFirst({ where: { id, userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, description, phase, startDate, targetDate } = await req.json();
  if (!title?.trim() || !targetDate) {
    return NextResponse.json({ error: "title and targetDate required" }, { status: 400 });
  }

  // Get next displayOrder
  const max = await db.milestone.aggregate({
    where: { projectId: id },
    _max: { displayOrder: true },
  });

  const milestone = await db.milestone.create({
    data: {
      userId,
      projectId:    id,
      projectName:  project.name,
      phase:        phase ?? null,
      title:        title.trim(),
      description:  (description ?? "").trim(),
      startDate:    startDate ? new Date(startDate) : null,
      targetDate:   new Date(targetDate),
      status:       "PENDING",
      displayOrder: (max._max.displayOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(milestone, { status: 201 });
}
