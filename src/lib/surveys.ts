// The survey variants an event can use. Each event picks one in admin; the
// device shows that variant's form. Add a variant here, then give it a form in
// src/components and an entry in FORMS (src/app/page.tsx).

export const SURVEYS = [
  { id: "fws-2026-10", label: "Financial Wellness Survey (Oct 2026)" },
] as const;

export type SurveyId = (typeof SURVEYS)[number]["id"];

export const DEFAULT_SURVEY: SurveyId = "fws-2026-10";

export const surveyLabel = (id: string | null | undefined) =>
  SURVEYS.find((s) => s.id === id)?.label ?? SURVEYS[0].label;

export const isSurvey = (id: unknown): id is SurveyId => SURVEYS.some((s) => s.id === id);
