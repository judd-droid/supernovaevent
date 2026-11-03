"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PART1, PART2, emptyAnswers, emptyContact, wantsContact, type Answers, type Contact, type Question } from "@/lib/survey";

// The one-page survey, laid out in two columns on an iPad like the printed form.
export function SurveyForm({ onSubmit }: { onSubmit: (a: Answers, c: Contact, consent: boolean) => void }) {
  const [a, setA] = useState<Answers>(emptyAnswers);
  const [c, setC] = useState<Contact>(emptyContact);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((x) => ({ ...x, [k]: v }));
  const toggle = (k: "saving" | "where" | "contactBy", v: string) => setA((x) => {
    // "Not started" and real answers don't go together in Q5.
    const none = "I have not started saving or investing yet.";
    let next = x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v];
    if (k === "where" && v === none && next.includes(none)) next = [none];
    else if (k === "where") next = next.filter((y) => y !== none || v === none);
    return { ...x, [k]: next };
  });
  const rank = (v: string) => setA((x) => {
    const r = x.ranked;
    return { ...x, ranked: r.includes(v) ? r.filter((y) => y !== v) : r.length < 3 ? [...r, v] : r };
  });

  const hasContact = !!(c.name.trim() || c.mobile.trim());
  const submit = () => {
    if (!a.ranked.length) return setError("Please choose at least your top priority in question 2.");
    if (!a.interest) return setError("Please answer question 9.");
    if (hasContact && !consent) return setError("To leave your name or mobile, please tick the consent box at the bottom.");
    if (c.mobile.trim() && !/^(\+?63|0)9\d{9}$/.test(c.mobile.replace(/[\s-]/g, ""))) return setError("Please check the mobile number (e.g. 0917 123 4567).");
    setError("");
    onSubmit(a, c, hasContact && consent);
  };

  const q = (x: Question) => (
    <fieldset key={x.no} className="mt-5">
      <legend className="font-medium leading-snug">{x.no}. {x.text}</legend>
      {x.hint && <p className="mt-0.5 text-sm text-muted">{x.hint}</p>}
      <div className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {x.options.map((o) => {
          const k = x.key;
          const rankNo = x.rank ? a.ranked.indexOf(o) + 1 : 0;
          const on = x.rank ? rankNo > 0 : x.multi ? (a[k] as string[]).includes(o) : a[k] === o;
          return (
            <button key={o} type="button"
              onClick={() => (x.rank ? rank(o) : x.multi ? toggle(k as "saving" | "where" | "contactBy", o) : set(k, (on ? "" : o) as never))}
              className={`flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left ${on ? "bg-accent-soft" : "active:bg-background"}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center border text-sm font-semibold
                ${x.multi || x.rank ? "rounded-md" : "rounded-full"} ${on ? "border-accent bg-accent text-white" : "border-line bg-white"}`}>
                {x.rank ? (rankNo || "") : on && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="leading-snug">{o}</span>
            </button>
          );
        })}
        {x.other && (
          <label className="flex min-h-12 items-center gap-3 px-3.5 py-2">
            <span className="text-muted">Other:</span>
            <input value={x.key === "saving" ? a.savingOther : a.whereOther}
              onChange={(e) => set(x.key === "saving" ? "savingOther" : "whereOther", e.target.value)}
              className="h-10 flex-1 rounded-lg border border-line bg-white px-2" />
          </label>
        )}
      </div>
      {x.no === 10 && (
        <label className="mt-2 block text-sm text-muted">Preferred day or time
          <input value={a.contactWhen} onChange={(e) => set("contactWhen", e.target.value)} placeholder="e.g. weekdays after 6 PM"
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-foreground" />
        </label>
      )}
    </fieldset>
  );

  const input = (label: string, k: keyof Contact, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="text-sm text-muted">{label}
      <input value={c[k]} onChange={(e) => setC((x) => ({ ...x, [k]: e.target.value }))} {...props}
        className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-foreground" />
    </label>
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Financial Wellness Survey</h1>
      <div className="mt-2 h-1 w-12 rounded bg-accent" />
      <p className="mt-3 max-w-3xl text-[15px] text-muted">
        Good day! We are a team of professional financial advisors seeking to understand the local market&rsquo;s
        financial wellness and needs. We would appreciate your answers to the following questions.
      </p>

      <div className="mt-2 grid gap-x-8 md:grid-cols-2">
        <section>
          <h2 className="mt-5 border-b border-line pb-1.5 font-display font-semibold">Part 1 · Your financial priorities</h2>
          {PART1.map(q)}
        </section>
        <section>
          <h2 className="mt-5 border-b border-line pb-1.5 font-display font-semibold">Part 2 · Your savings and preparedness</h2>
          {PART2.map(q)}
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-line bg-surface p-4">
        <h2 className="font-display font-semibold">Your details {wantsContact(a) ? "" : "(optional)"}</h2>
        <p className="mt-0.5 text-sm text-muted">Leave your name and mobile if you&rsquo;d like your result and a follow-up.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {input("Name", "name", { autoComplete: "name" })}
          {input("Mobile number", "mobile", { inputMode: "tel", placeholder: "09xx xxx xxxx" })}
          {input("Date of birth", "birthDate", { type: "date" })}
          <label className="text-sm text-muted">Gender
            <select value={c.gender} onChange={(e) => setC((x) => ({ ...x, gender: e.target.value }))}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 text-foreground">
              <option value=""></option><option>Female</option><option>Male</option><option>Prefer not to say</option>
            </select>
          </label>
          <label className="text-sm text-muted">Civil status
            <select value={c.civilStatus} onChange={(e) => setC((x) => ({ ...x, civilStatus: e.target.value }))}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 text-foreground">
              <option value=""></option><option>Single</option><option>Married</option><option>Separated</option><option>Widowed</option>
            </select>
          </label>
        </div>
        <button type="button" onClick={() => setConsent((v) => !v)}
          className={`mt-4 flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left text-sm ${consent ? "border-accent-line bg-accent-soft" : "border-line"}`}>
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${consent ? "border-accent bg-accent text-white" : "border-line bg-white"}`}>
            {consent && <Check size={13} strokeWidth={3} />}
          </span>
          <span>
            I agree that the financial advisor who gave me this survey may keep my details and contact me about my
            financial goals, as described in the <a href="/privacy" target="_blank" className="underline">privacy notice</a>.
          </span>
        </button>
      </section>

      {error && <p className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>}
      <button onClick={submit} className="mt-4 h-14 w-full rounded-xl bg-accent font-display text-lg font-semibold text-white">Submit</button>
      <p className="mt-3 text-center text-sm text-muted">
        Thank you for helping us better understand the community&rsquo;s financial priorities. Your responses will be kept confidential.
      </p>
    </div>
  );
}
