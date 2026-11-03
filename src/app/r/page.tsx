"use client";

import { useEffect, useState } from "react";
import { parseResult, type Result } from "@/lib/result";
import { ResultView } from "@/components/ResultView";

// A respondent's own copy of their Quick Result, opened from the QR code or the message.
export default function ResultPage() {
  const [res, setRes] = useState<Result | null | undefined>(undefined);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash is only readable after mount
  useEffect(() => setRes(parseResult(window.location.hash)), []);

  if (res === undefined) return null;
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8">
      <img src="/supernova-logo.png" alt="Supernova" className="h-6 w-auto" />
      <div className="mt-6">
        {res ? <ResultView res={res} /> : (
          <p className="text-sm text-muted">This link is incomplete. Ask your advisor to send it again.</p>
        )}
      </div>
      <p className="mt-6 text-xs text-muted">AIA Philippines · Supernova Financial</p>
    </main>
  );
}
