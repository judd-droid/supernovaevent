"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { getMobile, saveMobile, type Setup } from "@/lib/device";

type Ev = { id: string; name: string; date: string | null; venue: string; survey?: string };

// Choose the event, then the advisor taking the surveys. `only` = "advisor" skips
// straight to the name list (Switch advisor).
export function SetupScreen({ current, only, onDone, onCancel }: {
  current: Setup | null;
  only?: "advisor";
  onDone: (s: Setup) => void;
  onCancel?: () => void;
}) {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [advisors, setAdvisors] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [event, setEvent] = useState<Ev | null>(current ? { id: current.eventId, name: current.eventName, date: null, venue: "", survey: current.survey } : null);
  const [step, setStep] = useState<"event" | "advisor">(only === "advisor" && current ? "advisor" : "event");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState("");
  const [mobile, setMobile] = useState("");

  useEffect(() => {
    fetch("/api/setup").then((r) => r.json())
      .then((d) => { setEvents(d.events ?? []); setAdvisors(d.advisors ?? []); setErrors(d.errors ?? []); })
      .catch(() => { setEvents([]); setErrors(["Couldn't reach the server. Check the internet connection."]); });
  }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? advisors.filter((a) => a.toLowerCase().includes(t)) : advisors;
  }, [advisors, q]);

  const pick = (a: string) => { setPicked(a); setMobile(getMobile(a)); };
  const finish = () => {
    if (!event || !picked) return;
    saveMobile(picked, mobile.trim());
    onDone({ eventId: event.id, eventName: event.name, survey: event.survey, advisor: picked });
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
      <header className="flex items-center justify-between">
        <img src="/supernova_black.png" alt="Supernova" className="h-8 w-auto" />
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
          <label className="mt-4 flex h-12 items-center gap-2 rounded-lg border border-line bg-white px-3">
            <Search size={17} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your name" className="h-full flex-1 bg-transparent outline-none" />
          </label>
          <div className="mt-3 max-h-[45vh] divide-y divide-line overflow-y-auto rounded-xl border border-line bg-surface">
            {shown.map((a) => (
              <button key={a} onClick={() => pick(a)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left ${picked === a ? "bg-accent-soft" : "active:bg-background"}`}>
                <span>{a}</span>{picked === a && <Check size={18} className="text-accent" />}
              </button>
            ))}
            {!shown.length && <p className="px-4 py-3 text-sm text-muted">No matching names.</p>}
          </div>
          {picked && (
            <div className="mt-5 rounded-xl border border-line bg-surface p-4">
              <label className="text-sm text-muted">Your mobile number, for the result you send respondents (optional)
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
