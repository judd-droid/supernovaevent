// The respondent's Quick Result: their top priorities and their advisor. It is
// carried in the link itself (after the #), so the server never stores or sees it.

import { firstName, type SurveyResponse } from "@/lib/survey";

export type Result = { n: string; p: string[]; a: string; m: string; e: string };

export const NOTES: Record<string, string> = {
  "Retirement": "Starting early lets time do more of the work, even with small regular amounts.",
  "Buying a home or vehicle": "A clear target and timeline make it easier to set aside the right amount each month.",
  "A child’s education": "Tuition keeps rising, so a dedicated fund that starts early takes the pressure off later.",
  "Life and health protection": "Protection keeps your plans on track if illness or the unexpected comes first.",
  "Building an emergency fund": "Three to six months of expenses set aside is a common first milestone.",
  "Starting or expanding a business": "Keeping business and family funds separate protects both as you grow.",
};

export const toResult = (r: SurveyResponse, advisorMobile: string): Result => ({
  n: firstName(r.contact.name), p: r.answers.ranked, a: r.advisor, m: advisorMobile, e: r.eventName,
});

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const resultLink = (origin: string, res: Result) => `${origin}/r#${b64(JSON.stringify(res))}`;

export function parseResult(hash: string): Result | null {
  try {
    const s = hash.replace(/^#/, "").replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const r = JSON.parse(new TextDecoder().decode(bytes)) as Result;
    return Array.isArray(r.p) ? r : null;
  } catch {
    return null;
  }
}

export function resultText(res: Result, link: string): string {
  const hi = res.n ? `Hi ${res.n}! ` : "Hi! ";
  const top = res.p.length ? ` Your top priorities: ${res.p.map((p, i) => `${i + 1}) ${p}`).join(", ")}.` : "";
  return `${hi}Thank you for answering our Financial Wellness Survey.${top} Your Quick Result: ${link}\n\n` +
    `${res.a}, Financial Advisor${res.m ? `, ${res.m}` : ""}`;
}
