"use client";

import { use, useEffect, useState } from "react";
import { FORMS } from "@/lib/forms";
import { DEFAULT_SURVEY, type SurveyId } from "@/lib/surveys";
import { resultLink, toResult } from "@/lib/result";
import type { SurveyResponse } from "@/lib/survey";

type Ev = { name: string; survey: string; leader: string; leaderMobile: string };

// The self-service survey a respondent opens on their own phone from the event's
// QR code, or from an advisor's personal code (/e/me, no event). No sign-in. The survey belongs to the event's team leader (or, from an
// advisor's own code, to that advisor); with
// contact details it opens their Financial Wellness Snapshot, otherwise a thank-you.
export default function SelfService({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [ev, setEv] = useState<Ev | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [thanks, setThanks] = useState(false);
  // An advisor's own code adds a, m and s (signed); they travel with the answers.
  const [own, setOwn] = useState<{ a?: string; m?: string; s?: string }>({});

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const o = { a: q.get("a") ?? undefined, m: q.get("m") ?? undefined, s: q.get("s") ?? undefined };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is only readable after mount
    setOwn(o);
    const extra = new URLSearchParams(Object.entries(o).filter(([, v]) => v) as [string, string][]).toString();
    fetch(`/api/public/event?t=${encodeURIComponent(token)}${extra ? `&${extra}` : ""}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.ok) setEv(d as Ev);
        else { setError(d.error ?? "This survey isn't available."); setEv(null); }
      })
      .catch(() => { setError("Couldn't load the survey. Check your internet connection and try again."); setEv(null); });
  }, [token]);

  if (ev === undefined) return null;

  const Form = FORMS[(ev?.survey && ev.survey in FORMS ? ev.survey : DEFAULT_SURVEY) as SurveyId];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-8">
      <header className="-mx-5 mb-6 flex items-center gap-3 border-b border-line bg-surface px-5 py-3 md:-mx-8 md:px-8">
        <img src="/supernova-logo.png" alt="Supernova" className="h-6 w-auto shrink-0" />
        {ev && <div className="min-w-0 flex-1 translate-y-px truncate pl-2 text-sm font-medium">{ev.name}</div>}
      </header>

      {!ev ? (
        <p className="py-16 text-center text-muted">{error}</p>
      ) : thanks ? (
        <div className="mx-auto max-w-xl py-16 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight">Thank you for your time!</h1>
          <div className="mx-auto mt-3 h-1 w-12 rounded bg-accent" />
          <p className="mt-4 text-[17px] text-muted">
            Your answers help us understand the financial priorities of the people we serve.{ev.name ? " Enjoy the rest of the event!" : ""}
          </p>
        </div>
      ) : (
        <>
          <Form onSubmit={async (answers, contact, consent) => {
            if (sending) return;
            setSending(true);
            setSendError("");
            const r: SurveyResponse = {
              id: crypto.randomUUID(), eventId: "", eventName: ev.name, survey: ev.survey, advisor: ev.leader,
              answers, contact, consent, createdAt: new Date().toISOString(),
            };
            try {
              const res = await fetch("/api/public/responses", {
                method: "POST", headers: { "content-type": "application/json" },
                body: JSON.stringify({ t: token, id: r.id, answers, contact, consent, ...own }),
              });
              const d = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(d.error ?? "");
              if (consent) window.location.href = resultLink(window.location.origin, toResult(r, ev.leaderMobile));
              else { setThanks(true); window.scrollTo(0, 0); }
            } catch (e) {
              setSendError(e instanceof Error && e.message ? e.message : "Couldn't send your answers. Check your internet connection and tap Submit again.");
              setSending(false);
            }
          }} />
          {(sending || sendError) && (
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-5 py-3 text-center text-sm backdrop-blur">
              {sendError ? <span className="text-accent">{sendError}</span> : <span className="text-muted">Sending your answers…</span>}
            </div>
          )}
        </>
      )}
    </main>
  );
}
