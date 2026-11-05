// The Stats report for one event: how the booth did (yield, advisors, channels,
// timing), who to follow up first, and what respondents need (goals versus what
// they're actually saving for, readiness, and opportunity groups).

import { GOALS, PART1, PART2, type Answers, type Contact } from "@/lib/survey";

export type StatRow = {
  id: string; advisor: string; created_at: string; reassigned_from: string | null;
  data: { source?: string; qr?: string; answers: Answers; contact: Contact; consent: boolean };
};

export type Count = { label: string; n: number };
export type FollowUp = { row: StatRow; score: number; reasons: string[] };

const INSURANCE = "Insurance plans with savings or investment components";
const BANK = "Bank savings or time deposits";
const MP2 = "Pag-IBIG MP2 or government savings programs";
const NOT_STARTED = "I have not started saving or investing yet.";

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const deps = (d: string) => (d === "3 or more" ? 3 : Number(d) || 0);
const earner = (a: Answers) => a.role.startsWith("I am the primary") || a.role.startsWith("I share");
export const contactable = (r: StatRow) => !!(r.data.consent && (r.data.contact.name || r.data.contact.mobile));
const isYes = (a: Answers) => a.interest === "Yes";
const isMaybe = (a: Answers) => a.interest.startsWith("Maybe");

export function channel(r: StatRow): "device" | "booth" | "advisor" {
  if (r.data.source !== "qr") return "device";
  return r.data.qr === "advisor" ? "advisor" : "booth";
}
export const CHANNEL_LABEL = { device: "On an advisor's device", booth: "Booth QR code", advisor: "Advisor's own QR code" } as const;

// Short answer labels for charts.
const SHORT: Record<string, string> = {
  "I am the primary income earner.": "Primary earner",
  "I share the responsibility with someone else.": "Shares the load",
  "I am not currently responsible for household expenses.": "Not responsible",
  "I save regularly for retirement.": "Saves regularly",
  "I save occasionally for retirement.": "Saves occasionally",
  "I intend to start but have not started yet.": "Intends to start",
  "I have not considered retirement planning.": "Hasn't considered it",
  "I am already retired.": "Already retired",
  "I have not started saving yet.": "Hasn't started saving",
  [NOT_STARTED]: "Hasn't started",
  [INSURANCE]: "Insurance with savings",
  [BANK]: "Bank savings or time deposits",
  [MP2]: "Pag-IBIG MP2 or government",
  "Maybe, but I would like more information first.": "Maybe",
  "Not at this time.": "Not at this time",
  "I am not sure.": "Not sure",
  "Messenger or another social media platform": "Messenger or social media",
};
export const short = (s: string) => SHORT[s] ?? s;

const optionsOf = (key: keyof Answers) => [...PART1, ...PART2].find((q) => q.key === key)?.options ?? [];

// Count a single-answer question in its option order (unanswered left out).
function single(rows: StatRow[], key: keyof Answers): Count[] {
  return optionsOf(key).map((o) => ({ label: short(o), n: rows.filter((r) => r.data.answers[key] === o).length }));
}
function multi(rows: StatRow[], key: "saving" | "where" | "contactBy"): Count[] {
  return optionsOf(key).map((o) => ({ label: short(o), n: rows.filter((r) => (r.data.answers[key] as string[]).includes(o)).length }));
}

function age(birth: string, at: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  if (!m) return null;
  let a = at.getFullYear() - Number(m[1]);
  if (at.getMonth() + 1 < Number(m[2]) || (at.getMonth() + 1 === Number(m[2]) && at.getDate() < Number(m[3]))) a--;
  return a > 0 && a < 110 ? a : null;
}

const hourOf = (iso: string) => Number(new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", hour12: false }).format(new Date(iso))) % 24;
export const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

// Why this lead is worth an early call, strongest first.
function followUp(r: StatRow): FollowUp {
  const a = r.data.answers;
  let score = isYes(a) ? 6 : isMaybe(a) ? 3 : 0;
  const reasons: string[] = [];
  if (isYes(a)) reasons.push("Said yes to a conversation");
  else if (isMaybe(a)) reasons.push("Wants more information");
  const d = deps(a.dependents);
  const insured = a.where.includes(INSURANCE);
  if (a.role.startsWith("I am the primary") && d > 0) { score += 2; reasons.push(`Breadwinner, ${a.dependents === "3 or more" ? "3+" : d} ${d === 1 ? "dependent" : "dependents"}`); }
  if (earner(a) && d > 0 && !insured) { score += 2; reasons.push("No insurance plan yet"); }
  if (a.emergency === "Less than one month" || a.emergency === "I am not sure.") { score += 1; reasons.push("Thin emergency cushion"); }
  if (a.retirement.startsWith("I intend") || a.retirement.startsWith("I have not")) { score += 1; reasons.push("Retirement not started"); }
  const gap = a.ranked.find((g) => !a.saving.includes(g));
  if (gap) { score += 1; reasons.push(`Not saving yet for: ${gap}`); }
  return { row: r, score, reasons };
}

export type Group = { key: string; label: string; why: string; rows: StatRow[] };

export function report(rows: StatRow[], eventDate: Date) {
  const total = rows.length;
  const leads = rows.filter(contactable);
  const yes = rows.filter((r) => isYes(r.data.answers));
  const maybe = rows.filter((r) => isMaybe(r.data.answers));
  const hot = leads.filter((r) => isYes(r.data.answers) || isMaybe(r.data.answers));

  // Advisors
  const byAdvisor = [...new Set(rows.map((r) => r.advisor))].map((advisor) => {
    const mine = rows.filter((r) => r.advisor === advisor);
    return {
      advisor, surveys: mine.length, leads: mine.filter(contactable).length,
      yes: mine.filter((r) => isYes(r.data.answers)).length, maybe: mine.filter((r) => isMaybe(r.data.answers)).length,
      moved: mine.filter((r) => r.reassigned_from).length,
    };
  }).sort((a, b) => b.surveys - a.surveys || b.leads - a.leads);

  // Channels
  const channels = (["device", "booth", "advisor"] as const).map((c) => {
    const mine = rows.filter((r) => channel(r) === c);
    return { key: c, label: CHANNEL_LABEL[c], surveys: mine.length, leads: mine.filter(contactable).length, yes: mine.filter((r) => isYes(r.data.answers)).length };
  }).filter((c) => c.surveys);

  // Time of day
  const hours = new Map<number, number>();
  rows.forEach((r) => hours.set(hourOf(r.created_at), (hours.get(hourOf(r.created_at)) ?? 0) + 1));
  const hourKeys = [...hours.keys()];
  const byHour: Count[] = hourKeys.length
    ? Array.from({ length: Math.max(...hourKeys) - Math.min(...hourKeys) + 1 }, (_, i) => Math.min(...hourKeys) + i)
      .map((h) => ({ label: hourLabel(h), n: hours.get(h) ?? 0 }))
    : [];

  // Goals: priority (top 3, #1) versus saving for it
  const goals = GOALS.map((g) => {
    const ranked = rows.filter((r) => r.data.answers.ranked.includes(g));
    const unfunded = ranked.filter((r) => !r.data.answers.saving.includes(g));
    return {
      goal: g, top3: ranked.length, first: rows.filter((r) => r.data.answers.ranked[0] === g).length,
      saving: rows.filter((r) => r.data.answers.saving.includes(g)).length, unfunded: unfunded.length,
    };
  }).sort((a, b) => b.top3 - a.top3 || b.first - a.first);

  // Opportunity groups
  const groups: Group[] = [
    { key: "protection", label: "Earners with dependents and no insurance plan", why: "Protection: their family relies on an income with nothing behind it.",
      rows: rows.filter((r) => { const a = r.data.answers; return earner(a) && deps(a.dependents) > 0 && !a.where.includes(INSURANCE); }) },
    { key: "bank", label: "Savers who keep everything in the bank or MP2", why: "Savings and investment: long-term goals in accounts that may not keep up with inflation.",
      rows: rows.filter((r) => { const w = r.data.answers.where; return w.length > 0 && w.every((x) => x === BANK || x === MP2); }) },
    { key: "notstarted", label: "Not saving or investing yet", why: "A first plan: a small fixed amount builds the habit.",
      rows: rows.filter((r) => r.data.answers.where.includes(NOT_STARTED) || r.data.answers.satisfied.startsWith("I have not")) },
    { key: "retirement", label: "Retirement not started", why: "Retirement: every year of waiting raises the monthly amount needed.",
      rows: rows.filter((r) => r.data.answers.retirement.startsWith("I intend") || r.data.answers.retirement.startsWith("I have not")) },
    { key: "emergency", label: "Less than a month of savings, or not sure", why: "Emergency fund first, then protection, so one setback doesn't become debt.",
      rows: rows.filter((r) => r.data.answers.emergency === "Less than one month" || r.data.answers.emergency === "I am not sure.") },
    { key: "education", label: "Parents ranking a child's education in their top 3", why: "Education: the earlier the fund starts, the lighter the monthly amount.",
      rows: rows.filter((r) => deps(r.data.answers.dependents) > 0 && r.data.answers.ranked.includes("A child’s education")) },
  ].sort((a, b) => b.rows.length - a.rows.length);

  // Who they are
  const ages = rows.map((r) => age(r.data.contact.birthDate, eventDate)).filter((x): x is number => x !== null);
  const ageBands: Count[] = [["Under 25", 0, 24], ["25 to 34", 25, 34], ["35 to 44", 35, 44], ["45 to 54", 45, 54], ["55 and over", 55, 200]]
    .map(([label, lo, hi]) => ({ label: label as string, n: ages.filter((a) => a >= (lo as number) && a <= (hi as number)).length }));
  const tally = (key: "gender" | "civilStatus") => {
    const m = new Map<string, number>();
    rows.forEach((r) => { const v = r.data.contact[key]; if (v) m.set(v, (m.get(v) ?? 0) + 1); });
    return [...m].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
  };

  const follow = leads.map(followUp).filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score || a.row.created_at.localeCompare(b.row.created_at));

  // Takeaways in plain sentences
  const takeaways: string[] = [];
  if (total) {
    takeaways.push(`${total} surveys gave ${leads.length} leads with contact details (${pct(leads.length, total)}%). ${yes.length} said yes to a conversation and ${maybe.length} want more information first.`);
    const top = byAdvisor[0];
    if (byAdvisor.length > 1 && top) takeaways.push(`${top.advisor} took the most surveys (${top.surveys}), with ${top.leads} leads.`);
    const peak = [...byHour].sort((a, b) => b.n - a.n)[0];
    if (peak && byHour.length > 1) takeaways.push(`The busiest hour was ${peak.label}, with ${peak.n} surveys. Staff the next booth fully around that time.`);
    const gap = [...goals].filter((g) => g.top3 >= 3).sort((a, b) => b.unfunded / b.top3 - a.unfunded / a.top3)[0];
    if (gap && gap.unfunded) takeaways.push(`${gap.goal}: ${gap.top3} people rank it in their top 3, but ${pct(gap.unfunded, gap.top3)}% of them aren't saving for it yet. That's the strongest opening for follow-up.`);
    const g = groups[0];
    if (g && g.rows.length) takeaways.push(`The biggest need group is ${g.label.toLowerCase()} (${g.rows.length}, ${pct(g.rows.length, total)}% of respondents).`);
    const qr = channels.filter((c) => c.key !== "device");
    const dev = channels.find((c) => c.key === "device");
    if (qr.length && dev) {
      const qrS = qr.reduce((s, c) => s + c.surveys, 0), qrL = qr.reduce((s, c) => s + c.leads, 0);
      takeaways.push(`QR scans made up ${pct(qrS, total)}% of surveys and left details ${pct(qrL, qrS)}% of the time, against ${pct(dev.leads, dev.surveys)}% on advisors' devices.`);
    }
  }

  return {
    total, leads: leads.length, yes: yes.length, maybe: maybe.length, hot: hot.length, takeaways,
    byAdvisor, channels, byHour, goals, groups, follow,
    interest: single(rows, "interest"), role: single(rows, "role"), dependents: single(rows, "dependents"),
    emergency: single(rows, "emergency"), retirement: single(rows, "retirement"), satisfied: single(rows, "satisfied"),
    where: multi(rows, "where"), contactBy: multi(leads, "contactBy"),
    ageBands, agesKnown: ages.length, gender: tally("gender"), civil: tally("civilStatus"),
  };
}
