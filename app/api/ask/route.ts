import OpenAI from "openai";
import { NextResponse } from "next/server";
import { dataContext, parseAnswer, SYSTEM_RULES } from "@/lib/ai";
import type { DataProfile } from "@/lib/types";

export const runtime = "nodejs";

function isProfile(value: unknown): value is DataProfile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DataProfile>;
  return typeof candidate.rowCount === "number" && Array.isArray(candidate.columns) && Array.isArray(candidate.sampleRows);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!isProfile(body.profile) || !question || question.length > 300) {
      return NextResponse.json({ error: "Please ask a short question about your uploaded data." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI setup is incomplete. Add OPENAI_API_KEY, then try again." }, { status: 503 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      store: false,
      instructions: SYSTEM_RULES,
      input: `Answer the user's question using the compact profile. Return this exact JSON shape:
{"answer":"direct, plain-language response","evidence":"specific profile value(s) supporting it","caveat":"a useful limitation or uncertainty"}

User question: ${question}

Compact dataset profile:\n${dataContext(body.profile)}`,
      max_output_tokens: 650,
    });
    return NextResponse.json({ answer: parseAnswer(response.output_text) });
  } catch (error) {
    console.error("Question request failed", error);
    return NextResponse.json({ error: "DataSage could not answer that right now. Please try again in a moment." }, { status: 502 });
  }
}
