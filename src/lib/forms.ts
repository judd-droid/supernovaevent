import { SurveyForm } from "@/components/SurveyForm";
import type { SurveyId } from "@/lib/surveys";

// The form for each survey variant in src/lib/surveys.ts.
export const FORMS: Record<SurveyId, typeof SurveyForm> = {
  "fws-2026-10": SurveyForm,
};
