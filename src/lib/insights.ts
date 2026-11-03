// Turns a respondent's answers into their Quick Result: a snapshot of four areas,
// a short plan for each top priority, and a few observations. Educational only:
// no products and no premium budgets. The advisor takes it from there.

import { GOALS, type Answers } from "@/lib/survey";

export type Status = "good" | "building" | "attention";
export type Area = { key: string; label: string; status: Status; summary: string; text: string };
export type Plan = { goal: string; why: string; steps: string[] };

export const STATUS_LABEL: Record<Status, string> = { good: "On track", building: "Building", attention: "Needs attention" };

const INSURANCE = "Insurance plans with savings or investment components";
const NOT_STARTED = "I have not started saving or investing yet.";

const GUIDE: Record<string, { why: string; steps: string[] }> = {
  "Retirement": {
    why: "Time is your biggest advantage. The earlier you start, the less you need to set aside each month.",
    steps: [
      "Decide the age you'd like to retire and the monthly income you'll want by then.",
      "Set up a fixed monthly amount for retirement, kept apart from everyday savings.",
      "Check what SSS or GSIS will give you, and plan for the gap.",
    ],
  },
  "Buying a home or vehicle": {
    why: "A clear target and a date turn a big purchase into a monthly plan.",
    steps: [
      "Price what you want and pick a target date.",
      "Save the down payment in a separate account so it isn't spent.",
      "Keep the monthly loan payment comfortable, and make sure the loan wouldn't fall on your family.",
    ],
  },
  "A child’s education": {
    why: "Tuition keeps rising, so a fund that starts early takes the pressure off later.",
    steps: [
      "Estimate the cost for the year your child starts college, not today's price.",
      "Set aside a fixed amount each month in a fund used only for education.",
      "Make sure the fund would continue even if something happened to you.",
    ],
  },
  "Life and health protection": {
    why: "Protection keeps your plans on track if illness or the unexpected comes first.",
    steps: [
      "List who depends on your income, and for how many years.",
      "Check what your HMO or current insurance covers, and what it doesn't, such as critical illness.",
      "Aim for coverage that would replace several years of your income for your family.",
    ],
  },
  "Building an emergency fund": {
    why: "An emergency fund stops a surprise expense from turning into debt.",
    steps: [
      "Aim for 3 to 6 months of your household expenses.",
      "Keep it in an account you can reach quickly, apart from your spending money.",
      "Top it back up right after you use it.",
    ],
  },
  "Starting or expanding a business": {
    why: "A business grows best when both the business and the family are protected.",
    steps: [
      "Keep business and personal money separate.",
      "Build a reserve for slow months.",
      "Plan how the business and your family would be covered if you couldn't work.",
    ],
  },
};

export const planFor = (goal: string): Plan | null => (GUIDE[goal] ? { goal, ...GUIDE[goal] } : null);

const dependentsCount = (d: string) => (d === "3 or more" ? 3 : Number(d) || 0);
const dependentsText = (d: string) =>
  d === "3 or more" ? "three or more people" : d === "1" ? "one person" : d === "2" ? "two people" : "";

export function areas(a: Answers): Area[] {
  const out: Area[] = [];
  const earner = a.role.startsWith("I am the primary") || a.role.startsWith("I share");
  const deps = dependentsCount(a.dependents);
  const insured = a.where.includes(INSURANCE);

  // Protection
  if (a.role || a.dependents) {
    if (earner && deps > 0 && !insured) {
      out.push({ key: "protection", label: "Protection", status: "attention", summary: "Your income supports others",
        text: `Your income supports ${dependentsText(a.dependents)}. If it stopped, protection is what keeps their plans going.` });
    } else if (earner && deps > 0) {
      out.push({ key: "protection", label: "Protection", status: "building", summary: "Some cover in place",
        text: `You have an insurance plan. Check that it would replace several years of income for the ${dependentsText(a.dependents)} who rely on you.` });
    } else if (!insured) {
      out.push({ key: "protection", label: "Protection", status: "building", summary: "A good time to start",
        text: "With fewer people relying on your income, this is when protection costs the least to start." });
    } else {
      out.push({ key: "protection", label: "Protection", status: "good", summary: "Cover in place",
        text: "You have an insurance plan. Review it whenever your income or family changes." });
    }
  }

  // Emergency readiness
  const em: Record<string, [Status, string, string]> = {
    "More than 6 months": ["good", "More than 6 months", "That's a solid cushion against a sudden loss of income."],
    "4 to 6 months": ["good", "4 to 6 months", "You're within the recommended range of 3 to 6 months of expenses."],
    "1 to 3 months": ["building", "1 to 3 months", "You have some cushion. Growing it to 3 to 6 months gives your family more breathing room."],
    "Less than one month": ["attention", "Less than a month", "A loss of income would be felt within weeks. An emergency fund is a strong first step."],
    "I am not sure.": ["attention", "Not sure yet", "List your monthly expenses and compare them with your savings. Knowing the number is the first step."],
  };
  if (em[a.emergency]) {
    const [status, summary, text] = em[a.emergency];
    out.push({ key: "emergency", label: "Emergency readiness", status, summary, text });
  }

  // Savings habit
  const onlyBank = a.where.length === 1 && a.where[0] === "Bank savings or time deposits";
  const sv: Record<string, [Status, string]> = {
    "Very satisfied": ["good", "Very satisfied"],
    "Somewhat satisfied": ["building", "Somewhat satisfied"],
    "Not very satisfied": ["attention", "Not very satisfied"],
    "Not satisfied at all": ["attention", "Not satisfied"],
    "I have not started saving yet.": ["attention", "Not started"],
  };
  if (sv[a.satisfied] || a.where.length) {
    const [status, summary] = sv[a.satisfied] ?? ["building", "In progress"];
    const text = a.where.includes(NOT_STARTED) || a.satisfied.startsWith("I have not")
      ? "Starting with a small fixed amount every payday builds the habit faster than waiting for a bigger amount."
      : onlyBank
        ? "Your money is mainly in the bank. That's right for emergencies, but long-term goals may need options that can grow faster than inflation."
        : status === "good"
          ? "Keep it up, and check once a year that each goal has its own amount set aside."
          : "Giving each goal its own fixed monthly amount makes progress easier to see.";
    out.push({ key: "savings", label: "Savings habit", status, summary, text });
  }

  // Retirement readiness
  const re: Record<string, [Status, string, string]> = {
    "I save regularly for retirement.": ["good", "Saving regularly", "Keep checking that the amount matches the lifestyle you want later."],
    "I save occasionally for retirement.": ["building", "Saving sometimes", "Turning occasional saving into a fixed monthly amount makes retirement far more predictable."],
    "I intend to start but have not started yet.": ["attention", "Not started yet", "Starting this month, even with a small amount, puts time on your side."],
    "I have not considered retirement planning.": ["attention", "Not yet planned", "Retirement can feel far away, but every year you wait raises the amount you'll need each month."],
    "I am already retired.": ["good", "Retired", "The focus now is making your savings last and preparing for health costs."],
  };
  if (re[a.retirement]) {
    const [status, summary, text] = re[a.retirement];
    out.push({ key: "retirement", label: "Retirement readiness", status, summary, text });
  }
  return out;
}

// A few personal observations, strongest first.
export function observations(a: Answers): string[] {
  const out: string[] = [];
  const deps = dependentsCount(a.dependents);
  if (a.role.startsWith("I am the primary")) {
    out.push(deps > 0
      ? `As the main income earner supporting ${dependentsText(a.dependents)}, your ability to earn is your family's most valuable asset.`
      : "As the main income earner, your ability to earn is your household's most valuable asset.");
  } else if (a.role.startsWith("I share") && deps > 0) {
    out.push(`You share the household load and support ${dependentsText(a.dependents)}. Plans work best when both earners are covered.`);
  }
  const unfunded = a.ranked.filter((g) => !a.saving.includes(g));
  if (unfunded.length) {
    out.push(`${unfunded[0]} is one of your top priorities, but you aren't saving for it yet. That's the easiest gap to close first.`);
  }
  if (a.saving.length >= 3) out.push(`You're working on ${a.saving.length} goals at once. Giving each its own amount keeps them from competing.`);
  if (a.ranked[0] && a.ranked[0] !== "Life and health protection" && a.emergency === "Less than one month") {
    out.push("Before investing for bigger goals, a small emergency fund keeps one surprise from undoing your progress.");
  }
  return out.slice(0, 3);
}

export const score = (list: Area[]) => list.filter((x) => x.status === "good").length;

// Top priorities to plan for: the ranked ones, or the goals they're saving for.
export const priorities = (a: Answers): string[] =>
  (a.ranked.length ? a.ranked : a.saving.filter((g) => GOALS.includes(g))).slice(0, 3);
