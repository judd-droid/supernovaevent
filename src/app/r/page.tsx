"use client";

import { useEffect, useState } from "react";
import { NOTES, parseResult, type Result } from "@/lib/result";

// A respondent's own copy of their Quick Result, opened from the QR code or the message.
export default function ResultPage() {
  const [res, setRes] = useState<Result | null | undefined>(undefined);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash is only readable after mount
  useEffect(() => setRes(parseResult(window.location.hash)), []);

  if (res === undefined) return null;
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8">
      <img src="/supernova-logo.png" alt="Supernova" className="h-6 w-auto" />
      {!res ? (
        <p className="mt-8 text-sm text-muted">This link is incomplete. Ask your advisor to send it again.</p>
      ) : (
        <>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">Your Quick Result</h1>
          <p className="mt-1 text-sm text-muted">
            {res.n ? `Thank you, ${res.n}, ` : "Thank you "}for answering our Financial Wellness Survey{res.e ? ` at ${res.e}` : ""}.
          </p>
          <div className="mt-3 h-1 w-12 rounded bg-accent" />

          {res.p.length > 0 && (
            <section className="mt-6">
              <h2 className="font-display text-base font-semibold">Your top priorities</h2>
              <ol className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {res.p.map((p, i) => (
                  <li key={p} className="flex gap-3 px-4 py-3">
                    <span className="font-display text-lg font-semibold text-accent">{i + 1}</span>
                    <div>
                      <div className="font-medium">{p}</div>
                      {NOTES[p] && <p className="mt-0.5 text-sm text-muted">{NOTES[p]}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="mt-6 rounded-xl border border-line bg-surface px-4 py-3">
            <h2 className="text-sm text-muted">Your financial advisor</h2>
            <p className="mt-1 font-display text-lg font-semibold">{res.a}</p>
            {res.m && <a href={`tel:${res.m}`} className="text-accent">{res.m}</a>}
            <p className="mt-2 text-sm text-muted">
              Message your advisor anytime for a free, no-obligation conversation about these goals.
            </p>
          </section>
          <p className="mt-6 text-xs text-muted">AIA Philippines · Supernova Agency</p>
        </>
      )}
    </main>
  );
}
