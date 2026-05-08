import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function GET() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });

  const client = new Groq({ apiKey: key });
  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 16,
      messages: [{ role: "user", content: "Say hi" }],
    });
    return NextResponse.json({ ok: true, text: res.choices[0]?.message?.content });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json({ ok: false, status: e.status, message: e.message }, { status: 500 });
  }
}
