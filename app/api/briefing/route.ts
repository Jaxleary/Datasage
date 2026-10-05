import OpenAI from "openai";
import { NextResponse } from "next/server";
import { dataContext, parseBriefing, SYSTEM_RULES } from "@/lib/ai";
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
    if (!isProfile(body.profile)) return NextResponse.json({ error: "The uploaded data summary was not valid." }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI setup is incomplete. Add OPENAI_API_KEY, then try again." }, { status: 503 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      store: false,
      instructions: SYSTEM_RULES,
      input: `Create a concise data briefing. Return this exact JSON shape:
{"overview":"one or two sentences","insights":[{"headline":"short claim","evidence":"specific supporting statistic"},{"headline":"...","evidence":"..."},{"headline":"...","evidence":"..."}],"recommendedAction":"one practical next step","suggestedQuestions":["question one","question two"]}

Compact dataset profile:\n${dataContext(body.profile)}`,
      max_output_tokens: 900,
    });
    return NextResponse.json({ briefing: parseBriefing(response.output_text) });
  } catch (error) {
    console.error("Briefing request failed", error);
    return NextResponse.json({ error: "DataSage could not create an AI briefing right now. Your dashboard is still available." }, { status: 502 });
  }
}
