"use client";

import { useState } from "react";

export default function Login() {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode: pass }),
    }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return setError(d.error ?? "Couldn't reach the server.");
    const wantsAdmin = new URLSearchParams(window.location.search).get("admin");
    window.location.href = wantsAdmin && d.admin ? "/admin" : "/";
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <img src="/supernova-logo.png" alt="Supernova" className="h-7 w-auto self-start" />
      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">Financial Wellness Survey</h1>
      <p className="mt-1 text-sm text-muted">Enter the team passcode.<br />This device will remember it.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus placeholder="Passcode"
          className="h-12 w-full rounded-lg border border-line bg-white px-3" />
        {error && <p className="text-sm text-accent">{error}</p>}
        <button disabled={busy || !pass} className="h-12 w-full rounded-lg bg-foreground font-medium text-white disabled:opacity-40">
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
