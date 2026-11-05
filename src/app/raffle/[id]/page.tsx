"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";

// Raffle names for an event, to paste into a wheel-of-names app. Not linked from any
// screen respondents see; names stay hidden until someone taps Show names.
function shortName(full: string) {
  const parts = full.split(" ").filter(Boolean);
  if (parts.length < 2) return full;
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export default function Raffle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [event, setEvent] = useState("");
  const [names, setNames] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(false);
  const [full, setFull] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/raffle?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return setError(d.error ?? "Couldn't load this event.");
        setError(""); setEvent(d.event); setNames(d.names);
      })
      .catch(() => setError("Couldn't reach the server."))
      .finally(() => setLoading(false));
  }, [id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- first load from the server
  useEffect(() => { load(); }, [load]);

  const list = (names ?? []).map((n) => (full ? n : shortName(n)));
  const copy = async () => {
    try { await navigator.clipboard.writeText(list.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setShown(true); setError("Couldn't copy. Show the names, then select and copy them."); }
  };

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Raffle names</h1>
      <div className="mt-3 h-1 w-12 rounded bg-accent" />
      {event && <p className="mt-3 text-sm text-muted">{event} · QR scans with a name, once each</p>}
      {error && <p className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>}

      {names && (
        <>
          <p className="mt-6 font-display text-4xl font-bold">{names.length}<span className="ml-2 text-base font-normal text-muted">{names.length === 1 ? "name" : "names"}</span></p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={copy} disabled={!names.length}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-5 font-medium text-white disabled:opacity-40">
              {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copied" : "Copy names"}
            </button>
            <button onClick={() => setShown((s) => !s)}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-surface px-5 font-medium">
              {shown ? <EyeOff size={17} /> : <Eye size={17} />} {shown ? "Hide names" : "Show names"}
            </button>
            <button onClick={load} aria-label="Refresh" title="Refresh"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface text-muted">
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <label className="mt-5 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} className="h-4 w-4" />
            Use full names (otherwise first name and last initial)
          </label>

          {shown && (
            <ol className="mt-6 rounded-xl border border-line bg-surface">
              {list.map((n, i) => (
                <li key={i} className="flex gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
                  <span className="w-6 text-right text-muted">{i + 1}</span>{n}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-6 text-sm text-muted">Copy names, then paste them into the wheel&rsquo;s entry box (one name per line). Refresh before the draw to catch late scans.</p>
        </>
      )}
    </main>
  );
}
