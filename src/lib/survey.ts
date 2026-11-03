// The Financial Wellness Survey (Oct 2026), worded as the printed form in the
// Playbook. Keep the two in step: a change here is a change to the form.

export const GOALS = [
  "Retirement",
  "Buying a home or vehicle",
  "A child’s education",
  "Life and health protection",
  "Building an emergency fund",
  "Starting or expanding a business",
];

export type Question = {
  no: number;
  key: keyof Answers;
  text: string;
  hint?: string;
  options: string[];
  multi?: boolean;
  rank?: boolean;
  other?: boolean;
};

export type Answers = {
  saving: string[];      // Q1, several
  savingOther: string;
  ranked: string[];      // Q2, up to 3 in order
  role: string;          // Q3
  dependents: string;    // Q4
  where: string[];       // Q5, several
  whereOther: string;
  satisfied: string;     // Q6
  retirement: string;    // Q7
  emergency: string;     // Q8
  interest: string;      // Q9
  contactBy: string[];   // Q10, several
  contactWhen: string;
};

export type Contact = {
  name: string;
  mobile: string;
  gender: string;
  civilStatus: string;
  birthDate: string;
};

export type SurveyResponse = {
  id: string;
  eventId: string;
  eventName: string;
  survey: string;
  advisor: string;
  answers: Answers;
  contact: Contact;
  consent: boolean;
  createdAt: string;
};

export const emptyAnswers = (): Answers => ({
  saving: [], savingOther: "", ranked: [], role: "", dependents: "", where: [], whereOther: "",
  satisfied: "", retirement: "", emergency: "", interest: "", contactBy: [], contactWhen: "",
});

export const emptyContact = (): Contact => ({ name: "", mobile: "", gender: "", civilStatus: "", birthDate: "" });

export const PART1: Question[] = [
  { no: 1, key: "saving", text: "Which financial goals are you currently saving or investing for?", hint: "Choose all that apply.",
    options: GOALS, multi: true, other: true },
  { no: 2, key: "ranked", text: "Which three financial goals are most important to you right now?",
    hint: "Tap your highest priority first, then your second and third.", options: GOALS, rank: true },
  { no: 3, key: "role", text: "Which statement best describes your role in supporting your household financially?",
    options: ["I am the primary income earner.", "I share the responsibility with someone else.",
      "I am not currently responsible for household expenses."] },
  { no: 4, key: "dependents", text: "How many children or financial dependents do you support?",
    options: ["None", "1", "2", "3 or more"] },
];

export const PART2: Question[] = [
  { no: 5, key: "where", text: "Where do you currently keep or invest your money?", hint: "Choose all that apply.",
    options: ["Bank savings or time deposits", "Pag-IBIG MP2 or government savings programs", "Mutual funds or UITFs",
      "Stocks or bonds", "Insurance plans with savings or investment components", "Business or real estate",
      "I have not started saving or investing yet."], multi: true, other: true },
  { no: 6, key: "satisfied", text: "How satisfied are you with your current savings progress?",
    options: ["Very satisfied", "Somewhat satisfied", "Not very satisfied", "Not satisfied at all", "I have not started saving yet."] },
  { no: 7, key: "retirement", text: "Which statement best describes your retirement preparation?",
    options: ["I save regularly for retirement.", "I save occasionally for retirement.",
      "I intend to start but have not started yet.", "I have not considered retirement planning.", "I am already retired."] },
  { no: 8, key: "emergency", text: "If your household lost its main source of income, how long could your available savings cover regular expenses?",
    options: ["Less than one month", "1 to 3 months", "4 to 6 months", "More than 6 months", "I am not sure."] },
  { no: 9, key: "interest", text: "Would you be interested in a free, no-obligation conversation about your financial goals?",
    options: ["Yes", "Maybe, but I would like more information first.", "Not at this time."] },
  { no: 10, key: "contactBy", text: "If you selected Yes or Maybe, how would you prefer to be contacted?", hint: "Choose all that apply.",
    options: ["Mobile call", "Text message", "Messenger or another social media platform", "In person"], multi: true },
];

export const wantsContact = (a: Answers) => a.interest === "Yes" || a.interest.startsWith("Maybe");

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";
