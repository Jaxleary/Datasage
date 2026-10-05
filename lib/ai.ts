import type { Answer, Briefing, DataProfile } from "@/lib/types";

export const SYSTEM_RULES = `You are DataSage, a thoughtful business-data assistant for non-technical users.
Use ONLY the supplied compact dataset profile. Do not invent values, calculations, causes, or facts.
Describe patterns, not causal claims. If the profile cannot answer a question, say so plainly.
Keep wording clear and practical. Return valid JSON only, with no Markdown fences.`;

export function dataContext(profile: DataProfile): string {
  return JSON.stringify(profile);
}

function parseJson(text: string): unknown {
  const stripped = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(stripped);
}

export function parseBriefing(text: string): Briefing {
  const value = parseJson(text) as Partial<Briefing>;
  if (!value.overview || !Array.isArray(value.insights) || !value.recommendedAction || !Array.isArray(value.suggestedQuestions)) {
    throw new Error("The AI returned an incomplete briefing.");
  }
  return {
    overview: String(value.overview),
    insights: value.insights.slice(0, 3).map((insight) => ({
      headline: String(insight.headline ?? "Observation"),
      evidence: String(insight.evidence ?? "No supporting detail returned."),
    })),
    recommendedAction: String(value.recommendedAction),
    suggestedQuestions: value.suggestedQuestions.slice(0, 2).map(String),
  };
}

export function parseAnswer(text: string): Answer {
  const value = parseJson(text) as Partial<Answer>;
  if (!value.answer || !value.evidence || !value.caveat) {
    throw new Error("The AI returned an incomplete answer.");
  }
  return { answer: String(value.answer), evidence: String(value.evidence), caveat: String(value.caveat) };
}
