import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  const client = new Anthropic({ apiKey: key });

  try {
    const res = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 16,
      messages: [{ role: "user", content: "Say hi" }],
    });
    return NextResponse.json({
      ok: true,
      model: res.model,
      text: res.content[0].type === "text" ? res.content[0].text : null,
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; error?: unknown };
    return NextResponse.json({
      ok: false,
      status: e.status,
      message: e.message,
      detail: e.error,
    }, { status: 500 });
  }
}
