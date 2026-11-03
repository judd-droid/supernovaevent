"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { getMobile, saveMobile, type Setup } from "@/lib/device";

type Ev = { id: string; name: string; date: string | null; venue: string; survey?: string };

// Choose the event, then the advisor taking the surveys enters their agent code.
// `only` = "advisor" skips straight to the code (Switch advisor).
export function SetupScreen({ current, only, onDone, onCancel }: {
  current: Setup | null;
  only?: "advisor";
  onDone: (s: Setup) => void;
  onCancel?: () => void;
}) {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [event, setEvent] = useState<Ev | null>(current ? { id: current.eventId, name: current.eventName, date: null, venue: "", survey: current.survey } : null);
  const [step, setStep] = useState<"event" | "advisor">(only === "advisor" && current ? "advisor" : "event");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [picked, setPicked] = useState("");
  const [mobile, setMobile] = useState("");

  useEffect(() => {
    fetch("/api/setup").then((r) => r.json())
      .then((d) => { setEvents(d.events ?? []); setErrors(d.errors ?? []); })
      .catch(() => { setEvents([]); setErrors(["Couldn't reach the server. Check the internet connection."]); });
  }, []);

  const lookUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setCodeError("");
    setPicked("");
    const res = await fetch(`/api/advisor?code=${encodeURIComponent(code)}`).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setChecking(false);
    if (!res?.ok || !d.advisor) return setCodeError(d.error ?? "Couldn't reach the server. Check the internet connection.");
    setPicked(d.advisor);
    setMobile(getMobile(d.advisor));
  };
  const finish = () => {
    if (!event || !picked) return;
    saveMobile(picked, mobile.trim());
    onDone({ eventId: event.id, eventName: event.name, survey: event.survey, advisor: picked });
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
      <header className="flex items-center justify-between">
        <img src="/supernova-logo.png" alt="Supernova" className="h-8 w-auto" />
        {onCancel && <button onClick={onCancel} className="text-sm text-muted underline">Cancel</button>}
      </header>
      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">
        {step === "event" ? "Which event is this?" : "Who is taking the surveys?"}
      </h1>
      <div className="mt-3 h-1 w-12 rounded bg-accent" />
      {errors.map((e) => <p key={e} className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{e}</p>)}

      {step === "event" ? (
        <div className="mt-6">
          {events === null && <p className="text-sm text-muted">Loading events…</p>}
          {events?.length === 0 && !errors.length && <p className="text-sm text-muted">No open events yet. Ask Judd to add one.</p>}
          {events && events.length > 0 && (
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {events.map((e) => (
                <button key={e.id} onClick={() => { setEvent(e); setStep("advisor"); }}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-background">
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[17px] font-semibold">{e.name}</div>
                    {e.venue && <div className="text-sm text-muted">{e.venue}</div>}
                  </div>
                  {event?.id === e.id && <Check size={18} className="text-accent" />}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-sm text-muted">Event: <b className="font-medium text-foreground">{event?.name}</b>{!only && (
            <button onClick={() => setStep("event")} className="ml-2 underline">Change</button>)}</p>
          <form onSubmit={lookUp} className="mt-4 flex gap-2">
            <input value={code} onChange={(e) => { setCode(e.target.value); setPicked(""); }} inputMode="numeric" autoComplete="off"
              placeholder="Your agent code" aria-label="Agent code"
              className="h-12 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 tracking-wider" />
            <button disabled={checking || !code.trim()} className="h-12 rounded-lg bg-foreground px-5 font-medium text-white disabled:opacity-40">
              {checking ? "Checking…" : "Continue"}
            </button>
          </form>
          {codeError && <p className="mt-2 text-sm text-accent">{codeError}</p>}
          {picked && (
            <div className="mt-5 rounded-xl border border-line bg-surface p-4">
              <p className="flex items-center gap-2 font-display text-lg font-semibold"><Check size={18} className="text-accent" /> {picked}</p>
              <label className="mt-3 block text-sm text-muted">Your mobile number, for the result you send respondents (optional)
                <input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" placeholder="09xx xxx xxxx"
                  className="mt-1 h-12 w-full rounded-lg border border-line bg-white px-3 text-foreground" />
              </label>
              <button onClick={finish} className="mt-4 h-12 w-full rounded-lg bg-accent font-medium text-white">
                Start surveys as {picked}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
