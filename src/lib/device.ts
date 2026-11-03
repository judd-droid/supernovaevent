"use client";

// What this device remembers: the chosen event and advisor, each advisor's mobile
// for the result message, and surveys not yet sent. Answers are kept only until
// the server has them, so the device never builds up a list of past surveys.

import type { SurveyResponse } from "@/lib/survey";

export type Setup = { eventId: string; eventName: string; survey?: string; advisor: string };

const SETUP = "sv.setup";
const PENDING = "sv.pending";
const SENT = "sv.sent";
const MOBILES = "sv.mobiles";

const read = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
};

export const getSetup = () => read<Setup | null>(SETUP, null);
export const saveSetup = (s: Setup | null) => (s ? write(SETUP, s) : localStorage.removeItem(SETUP));

export const getMobile = (advisor: string) => read<Record<string, string>>(MOBILES, {})[advisor] ?? "";
export const saveMobile = (advisor: string, mobile: string) => write(MOBILES, { ...read<Record<string, string>>(MOBILES, {}), [advisor]: mobile });

export const pendingCount = () => read<SurveyResponse[]>(PENDING, []).length;

// A count of surveys sent from this device today, per advisor and event (not the surveys).
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
function countSent(list: SurveyResponse[]) {
  const c = read<{ day: string; counts: Record<string, number> }>(SENT, { day: "", counts: {} });
  const counts = c.day === today() ? c.counts : {};
  for (const r of list) counts[`${r.eventId}|${r.advisor}`] = (counts[`${r.eventId}|${r.advisor}`] ?? 0) + 1;
  write(SENT, { day: today(), counts });
}

export function queue(r: SurveyResponse) {
  write(PENDING, [...read<SurveyResponse[]>(PENDING, []), r]);
}

let syncing: Promise<number> | null = null;

// Send whatever is waiting. Returns how many are still waiting afterwards.
// The lock is released in .finally() after it's set, so a quick run (nothing
// waiting) can't leave it stuck on.
export function sync(): Promise<number> {
  if (!syncing) syncing = send().finally(() => { syncing = null; });
  return syncing;
}

async function send(): Promise<number> {
  try {
    const list = read<SurveyResponse[]>(PENDING, []);
    if (!list.length) return 0;
    const res = await fetch("/api/responses", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ responses: list }),
    });
    if (!res.ok) return list.length;
    const { saved } = (await res.json()) as { saved: string[] };
    const done = new Set(saved);
    countSent(list.filter((r) => done.has(r.id)));
    const left = read<SurveyResponse[]>(PENDING, []).filter((r) => !done.has(r.id));
    write(PENDING, left);
    return left.length;
  } catch {
    return pendingCount();
  }
}
