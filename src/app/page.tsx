"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CloudOff, Eye, EyeOff, UserRound } from "lucide-react";
import { SetupScreen } from "@/components/SetupScreen";
import { SurveyForm } from "@/components/SurveyForm";
import { ResultScreen } from "@/components/ResultScreen";
import { getMobile, getSetup, pendingCount, queue, saveSetup, sync, type Setup } from "@/lib/device";
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
  const [navHidden, setNavHidden] = useState(false);

  const refresh = useCallback(() => setPending(pendingCount()), []);

  // The top bar can be hidden so respondents see only the survey; the device remembers it.
  const toggleNav = (hide: boolean) => {
    setNavHidden(hide);
    try { localStorage.setItem("sv.navHidden", hide ? "1" : ""); } catch { /* blocked */ }
  };

  const trySync = useCallback(async () => {
    await sync();
    refresh();
  }, [refresh]);

  useEffect(() => {
    const s = getSetup();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- device storage is only readable after mount
    setSetup(s);
    try { setNavHidden(localStorage.getItem("sv.navHidden") === "1"); } catch { /* blocked */ }
    refresh();
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
        onDone={(s) => { saveSetup(s); setSetup(s); setChanging(null); setDone(null); setFormKey((k) => k + 1); refresh(); }} />
    );
  }

  const next = () => { setDone(null); setFormKey((k) => k + 1); window.scrollTo(0, 0); };
  const survey = (setup.survey && setup.survey in FORMS ? setup.survey : DEFAULT_SURVEY) as SurveyId;
  const Form = FORMS[survey];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-8">
      {navHidden ? (
        <>
          <button onClick={() => toggleNav(false)} aria-label="Show the top bar" title="Show the top bar"
            className="fixed right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/90 text-muted shadow-sm backdrop-blur">
            <Eye size={18} />
          </button>
          <div className="h-6" />
        </>
      ) : (
        <header className="sticky top-0 z-10 -mx-5 mb-6 flex items-center gap-2 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur md:-mx-8 md:gap-3 md:px-8">
          <img src="/supernova-logo.png" alt="Supernova" className="h-6 w-auto shrink-0" />
          <div className="min-w-0 flex-1 translate-y-px truncate pl-2 text-sm font-medium"><span className="hidden sm:inline">{setup.eventName}</span></div>
          {pending > 0 && (
            <span title={`${pending} waiting to send`} aria-label={`${pending} waiting to send`} className="text-accent"><CloudOff size={18} /></span>
          )}
          <button onClick={() => setChanging("advisor")}
            aria-label={`Switch advisor (${setup.advisor})`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-sm font-medium">
            <UserRound size={16} /> <span className="hidden max-w-40 truncate sm:inline">{setup.advisor}</span>
          </button>
          <button onClick={() => setChanging("all")} aria-label="Change event" title="Change event"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-muted">
            <CalendarDays size={17} />
          </button>
          <button onClick={() => toggleNav(true)} aria-label="Hide the top bar" title="Hide the top bar"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted">
            <EyeOff size={17} />
          </button>
        </header>
      )}

      {done ? (
        // The Quick Result is for respondents who left their contact details; everyone else is thanked.
        done.consent ? (
          <ResultScreen response={done} advisorMobile={getMobile(done.advisor)} onNext={next} />
        ) : (
          <div className="mx-auto max-w-xl py-16 text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight">Thank you for your time!</h1>
            <div className="mx-auto mt-3 h-1 w-12 rounded bg-accent" />
            <p className="mt-4 text-[17px] text-muted">
              Your answers help us understand the financial priorities of the people we serve. Enjoy the rest of the event!
            </p>
            <button onClick={next} className="mt-10 h-12 rounded-lg bg-foreground px-8 font-medium text-white">New survey</button>
          </div>
        )
      ) : (
        <Form key={formKey} onSubmit={(answers, contact, consent) => {
          const r: SurveyResponse = {
            id: crypto.randomUUID(), eventId: setup.eventId, eventName: setup.eventName, survey, advisor: setup.advisor,
            answers, contact: consent ? contact : { ...contact, name: "", mobile: "", birthDate: "" }, consent,
            createdAt: new Date().toISOString(),
          };
          queue(r);
          setDone(r);
          refresh();
          window.scrollTo(0, 0);
          trySync();
        }} />
      )}
    </main>
  );
}
