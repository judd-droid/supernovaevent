// The respondent's Quick Result travels in the link itself (after the #), so the
// server never stores or sees it. Answers are packed as option numbers to keep
// the link, and so the QR code, short.

import { PART1, PART2, emptyAnswers, firstName, type Answers, type SurveyResponse } from "@/lib/survey";
import { priorities } from "@/lib/insights";

// n: first name, a: advisor, m: advisor mobile, e: event, x: packed answers.
// p: top priorities (links made before the full result existed carry only this).
export type Result = { n: string; a: string; m: string; e: string; x?: Record<string, number | number[]>; p?: string[] };

const QUESTIONS = [...PART1, ...PART2].filter((q) => q.key !== "contactBy");

function pack(a: Answers): Record<string, number | number[]> {
  const out: Record<string, number | number[]> = {};
  for (const q of QUESTIONS) {
    const v = a[q.key];
    if (Array.isArray(v)) { const idx = v.map((x) => q.options.indexOf(x)).filter((i) => i >= 0); if (idx.length) out[q.no] = idx; }
    else { const i = q.options.indexOf(v as string); if (i >= 0) out[q.no] = i; }
  }
  return out;
}

export function unpack(x: Record<string, number | number[]>): Answers {
  const a = emptyAnswers();
  for (const q of QUESTIONS) {
    const v = x[q.no];
    if (v === undefined) continue;
    const pick = (i: number) => q.options[i] ?? "";
    (a as Record<string, unknown>)[q.key] = Array.isArray(v) ? v.map(pick).filter(Boolean) : pick(v);
  }
  return a;
}

export const toResult = (r: SurveyResponse, advisorMobile: string): Result => ({
  n: firstName(r.contact.name), a: r.advisor, m: advisorMobile, e: r.eventName, x: pack(r.answers),
});

// The answers behind a result (older links: priorities only).
export const answersOf = (res: Result): Answers =>
  res.x ? unpack(res.x) : { ...emptyAnswers(), ranked: res.p ?? [] };

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const resultLink = (origin: string, res: Result) => `${origin}/r#${b64(JSON.stringify(res))}`;

export function parseResult(hash: string): Result | null {
  try {
    const s = hash.replace(/^#/, "").replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const r = JSON.parse(new TextDecoder().decode(bytes)) as Result;
    return r && (r.x || Array.isArray(r.p)) ? r : null;
  } catch {
    return null;
  }
}

export function resultText(res: Result, link: string): string {
  const top = priorities(answersOf(res));
  const hi = res.n ? `Hi ${res.n}! ` : "Hi! ";
  const list = top.length ? ` Your top priorities: ${top.map((p, i) => `${i + 1}) ${p}`).join(", ")}.` : "";
  return `${hi}Thank you for answering our Financial Wellness Survey.${list} Your Financial Wellness Snapshot, with ` +
    `where you stand and next steps for each goal: ${link}\n\n${res.a}, Financial Advisor${res.m ? `, ${res.m}` : ""}`;
}
