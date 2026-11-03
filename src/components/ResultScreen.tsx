"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, MessageSquare, Send } from "lucide-react";
import { NOTES, resultLink, resultText, toResult } from "@/lib/result";
import type { SurveyResponse } from "@/lib/survey";

// Shown after Submit. The respondent scans the QR code to keep their result, or
// the advisor sends it by SMS or Viber.
export function ResultScreen({ response, advisorMobile, onNext }: {
  response: SurveyResponse;
  advisorMobile: string;
  onNext: () => void;
}) {
  const res = toResult(response, advisorMobile);
  const link = typeof window === "undefined" ? "" : resultLink(window.location.origin, res);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: "#14181c", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response.id]);

  const text = link ? resultText(res, link) : "";
  const mobile = response.contact.mobile.replace(/[\s-]/g, "");

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ }
  };

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Thank you{res.n ? `, ${res.n}` : ""}!
        </h1>
        <div className="mt-2 h-1 w-12 rounded bg-accent" />
        <p className="mt-3 text-muted">Here is your Quick Result from the Financial Wellness Survey.</p>
        {res.p.length > 0 && (
          <ol className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
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
        )}
        <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-3">
          <div className="text-sm text-muted">Your financial advisor</div>
          <div className="font-display text-lg font-semibold">{res.a}</div>
          {res.m && <div className="text-accent">{res.m}</div>}
        </div>
      </div>

      <aside className="rounded-xl border border-line bg-surface p-4">
        <h2 className="font-display font-semibold">Keep your result</h2>
        <p className="mt-0.5 text-sm text-muted">Scan with your phone camera.</p>
        {qr ? <img src={qr} alt="QR code for your result" className="mx-auto mt-3 w-full max-w-[260px]" />
          : <div className="mt-3 aspect-square w-full rounded-lg bg-background" />}
        <div className="mt-4 space-y-2">
          {mobile && (
            <a href={`sms:${mobile}?&body=${encodeURIComponent(text)}`}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line font-medium">
              <MessageSquare size={17} /> Send by SMS
            </a>
          )}
          <a href={`viber://forward?text=${encodeURIComponent(text)}`}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line font-medium">
            <Send size={17} /> Send by Viber
          </a>
          <button onClick={copy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line font-medium">
            <Copy size={17} /> {copied ? "Copied" : "Copy message"}
          </button>
        </div>
        <button onClick={onNext} className="mt-4 h-12 w-full rounded-lg bg-foreground font-medium text-white">New survey</button>
      </aside>
    </div>
  );
}
