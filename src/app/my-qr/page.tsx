"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { MyQr } from "@/components/MyQr";
import { getMobile, getSetup, saveMobile } from "@/lib/device";

// An advisor's personal QR code, tied to no event: for surveys outside a booth or
// event (a client meeting, a referral, a social post). Behind the team sign-in like
// the rest of the app. The advisor confirms who they are with their agent code (or
// the advisor this device is already set to); scans become their leads, with no
// event name, in their Logger.
export default function MyQrPage() {
  const [advisor, setAdvisor] = useState("");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [picked, setPicked] = useState("");
  const [ready, setReady] = useState(false);

  // Device storage is only readable after mount: start from the advisor this device is set to.
  useEffect(() => {
    const s = getSetup();
    /* eslint-disable react-hooks/set-state-in-effect -- one read of device storage on mount */
    if (s?.advisor) setMobile(getMobile(s.advisor));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
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

  if (!ready) return null;
  if (advisor) return <MyQr advisor={advisor} mobile={mobile} onClose={() => { window.location.href = "/"; }} onReconfirm={() => setAdvisor("")} />;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
      <header className="flex items-center justify-between">
        <img src="/supernova-logo.png" alt="Supernova" className="h-6 w-auto" />
        <Link href="/" className="text-sm text-muted underline">Back</Link>
      </header>
      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">Your personal QR code</h1>
      <div className="mt-3 h-1 w-12 rounded bg-accent" />
      <p className="mt-4 text-sm text-muted">
        For surveys outside an event. Anyone who scans it answers the survey on their own phone, and their answers come to
        your Logger as a lead with no event name.
      </p>

      <form onSubmit={lookUp} className="mt-6 flex gap-2">
        <label className="flex h-12 min-w-0 flex-1 items-center rounded-lg border border-line bg-white px-3 focus-within:border-foreground">
          <span className="select-none tracking-wider text-muted">00</span>
          <input value={code} onChange={(e) => { setCode(e.target.value); setPicked(""); }} inputMode="numeric" autoComplete="off"
            placeholder="7123456" aria-label="Agent code, after the 00"
            className="h-full min-w-0 flex-1 bg-transparent pl-0.5 tracking-wider outline-none" />
        </label>
        <button disabled={checking || !code.trim()} className="h-12 rounded-lg bg-foreground px-5 font-medium text-white disabled:opacity-40">
          {checking ? "Checking…" : "Continue"}
        </button>
      </form>
      {codeError && <p className="mt-2 text-sm text-accent">{codeError}</p>}

      {picked && (
        <div className="mt-5 rounded-xl border border-line bg-surface p-4">
          <p className="flex items-center gap-2 font-display text-lg font-semibold"><Check size={18} className="text-accent" /> {picked}</p>
          <label className="mt-3 block text-sm text-muted">Your mobile number, for the result respondents receive (optional)
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" placeholder="09xx xxx xxxx"
              className="mt-1 h-12 w-full rounded-lg border border-line bg-white px-3 text-foreground" />
          </label>
          <button onClick={() => { saveMobile(picked, mobile.trim()); setAdvisor(picked); }}
            className="mt-4 h-12 w-full rounded-lg bg-accent font-medium text-white">
            Show my QR code
          </button>
        </div>
      )}
    </main>
  );
}
