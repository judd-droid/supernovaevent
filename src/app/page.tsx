"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, UserRound } from "lucide-react";
import { SetupScreen } from "@/components/SetupScreen";
import { SurveyForm } from "@/components/SurveyForm";
import { ResultScreen } from "@/components/ResultScreen";
import { getMobile, getSetup, pendingCount, queue, saveSetup, sentToday, sync, type Setup } from "@/lib/device";
import { DEFAULT_SURVEY, type SurveyId } from "@/lib/surveys";
import type { SurveyResponse } from "@/lib/survey";

// The form for each survey variant in src/lib/surveys.ts.
const FORMS: Record<SurveyId, typeof SurveyForm> = {
  "fws-2026-10": SurveyForm,
};

export default function Home() {
  const [setup, setSetup] = useState<Setup | null | undefined>(undefined);
  const [changing, setChanging] = useState<"all" | "advisor" | null>(null);
  const [done, setDone] = useState<SurveyResponse | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(0);
  const [sent, setSent] = useState(0);

  const refresh = useCallback((s: Setup | null) => {
    setPending(pendingCount());
    setSent(s ? sentToday(s) : 0);
  }, []);

  const trySync = useCallback(async () => {
    await sync();
    refresh(getSetup());
  }, [refresh]);

  useEffect(() => {
    const s = getSetup();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- device storage is only readable after mount
    setSetup(s);
    refresh(s);
    trySync();
    // Pick up a survey variant changed in admin after this device chose the event.
    if (s) {
      fetch("/api/setup").then((r) => r.json()).then((d: { events?: { id: string; survey: string }[] }) => {
        const ev = d.events?.find((e) => e.id === s.eventId);
        if (ev && ev.survey !== s.survey) { const next = { ...s, survey: ev.survey }; saveSetup(next); setSetup(next); }
      }).catch(() => {});
    }
    const t = setInterval(trySync, 30_000);
    window.addEventListener("online", trySync);
    return () => { clearInterval(t); window.removeEventListener("online", trySync); };
  }, [refresh, trySync]);

  if (setup === undefined) return null;

  if (!setup || changing) {
    return (
      <SetupScreen current={setup} only={changing === "advisor" ? "advisor" : undefined}
        onCancel={setup ? () => setChanging(null) : undefined}
        onDone={(s) => { saveSetup(s); setSetup(s); setChanging(null); setDone(null); setFormKey((k) => k + 1); refresh(s); }} />
    );
  }

  const survey = (setup.survey && setup.survey in FORMS ? setup.survey : DEFAULT_SURVEY) as SurveyId;
  const Form = FORMS[survey];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-8">
      <header className="sticky top-0 z-10 -mx-5 mb-6 flex items-center gap-3 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur md:-mx-8 md:px-8">
        <img src="/supernova_black.png" alt="Supernova" className="h-7 w-auto" />
        <div className="min-w-0 flex-1 text-sm">
          <div className="truncate font-medium">{setup.eventName}</div>
          <div className="truncate text-muted">
            {sent} sent today{pending > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-accent"><CloudOff size={13} /> {pending} waiting to send</span>
            )}
          </div>
        </div>
        <button onClick={() => setChanging("advisor")}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-medium">
          <UserRound size={16} /> <span className="max-w-40 truncate">{setup.advisor}</span>
        </button>
        <button onClick={() => setChanging("all")} className="hidden text-sm text-muted underline md:block">Change event</button>
      </header>

      {done ? (
        <ResultScreen response={done} advisorMobile={getMobile(done.advisor)}
          onNext={() => { setDone(null); setFormKey((k) => k + 1); window.scrollTo(0, 0); }} />
      ) : (
        <Form key={formKey} onSubmit={(answers, contact, consent) => {
          const r: SurveyResponse = {
            id: crypto.randomUUID(), eventId: setup.eventId, eventName: setup.eventName, survey, advisor: setup.advisor,
            answers, contact: consent ? contact : { ...contact, name: "", mobile: "", birthDate: "" }, consent,
            createdAt: new Date().toISOString(),
          };
          queue(r);
          setDone(r);
          refresh(setup);
          window.scrollTo(0, 0);
          trySync();
        }} />
      )}
    </main>
  );
}
