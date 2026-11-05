"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, Plus, QrCode, Ticket, Trash2 } from "lucide-react";
import type { Answers, Contact } from "@/lib/survey";
import { DEFAULT_SURVEY, SURVEYS, surveyLabel } from "@/lib/surveys";

type Ev = {
  id: string; name: string; date: string | null; venue: string; active: boolean; survey: string; responses: number;
  leader: string | null; leader_mobile: string; public_token: string;
};
type Row = {
  id: string; event_id: string; advisor: string; created_at: string; reassigned_from: string | null;
  data: { eventName?: string; source?: string; answers: Answers; contact: Contact; consent: boolean };
};

type Req = {
  id: string; response_id: string; from_advisor: string; to_advisor: string; requested_by: string; note: string;
  created_at: string; lead_name: string | null; event_name: string | null; current_advisor: string;
};

const when = (iso: string) => new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
}).format(new Date(iso));

// Event names follow "Venue YYYY/MM/DD", e.g. "San Beda 2026/11/05".
const suggestName = (venue: string, date: string) => [venue.trim(), date.replace(/-/g, "/")].filter(Boolean).join(" ");

export default function Admin() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [advisors, setAdvisors] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [survey, setSurvey] = useState<string>(DEFAULT_SURVEY);
  const [open, setOpen] = useState<string | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [moveEvent, setMoveEvent] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [e, r, q] = await Promise.all([
      fetch("/api/admin/events").then((x) => x.json()),
      fetch(`/api/admin/responses${filter ? `?event=${filter}` : ""}`).then((x) => x.json()),
      fetch("/api/admin/requests").then((x) => x.json()),
    ]).catch(() => [{ error: "Couldn't reach the server." }, {}, {}]);
    setError(e.error ?? r.error ?? q.error ?? "");
    setEvents(e.events ?? []);
    setRows(r.responses ?? []);
    setRequests(q.requests ?? []);
  }, [filter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches, then sets state
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/admin/advisors").then((x) => x.json()).then((d) => setAdvisors(d.advisors ?? [])).catch(() => {}); }, []);

  const evName = useMemo(() => new Map(events.map((e) => [e.id, e.name])), [events]);

  const saveEvent = async (body: Partial<Ev> & { leaderMobile?: string }) => {
    const res = await fetch("/api/admin/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error ?? "Couldn't save the event.");
    load();
  };
  const reassign = async (id: string, advisor: string) => {
    await fetch("/api/admin/responses", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, advisor }) });
    load();
  };
  const changeEvent = async (r: Row, toEvent: string) => {
    const res = await fetch("/api/admin/responses", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: r.id, toEvent }) });
    const d = await res.json().catch(() => ({}));
    setNotice(res.ok ? `Moved ${r.data.contact.name || "the survey"} to ${evName.get(toEvent)}.` : d.error ?? "Couldn't change the event.");
    load();
  };

  // Move every lead of one advisor (optionally only one event's) to another.
  const moveAll = async () => {
    const scope = moveEvent ? ` from ${evName.get(moveEvent)}` : "";
    if (!window.confirm(`Move all of ${moveFrom}'s leads${scope} to ${moveTo}?`)) return;
    const res = await fetch("/api/admin/responses", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ from: moveFrom, advisor: moveTo, event: moveEvent || undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setNotice(res.ok ? `Moved ${d.moved} ${d.moved === 1 ? "lead" : "leads"} to ${moveTo}.` : d.error ?? "Couldn't move the leads.");
    load();
  };

  // Delete all of an event's surveys. Asked twice: a confirm, then typing DELETE.
  const purge = async (e: Ev) => {
    if (!e.responses) return setNotice(`${e.name} has no surveys to delete.`);
    if (!window.confirm(`Delete all ${e.responses} surveys from ${e.name}? Their leads will also disappear from the advisors' Loggers.`)) return;
    const typed = window.prompt(`This can't be undone. Type DELETE to remove all ${e.responses} surveys from ${e.name}.`);
    if (typed?.trim() !== "DELETE") return setNotice("Nothing was deleted.");
    const res = await fetch("/api/admin/purge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: e.id }) });
    const d = await res.json().catch(() => ({}));
    setNotice(res.ok ? `Deleted ${d.deleted} surveys from ${e.name}.` : d.error ?? "Couldn't delete the surveys.");
    load();
  };

  const decide = async (id: string, approve: boolean) => {
    const res = await fetch("/api/admin/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, approve }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setNotice(d.error ?? "Couldn't update the request.");
    load();
  };

  const owners = useMemo(() => [...new Set(rows.map((r) => r.advisor))].sort(), [rows]);

  const exportCsv = () => {
    const head = ["Date", "Event", "Advisor", "Name", "Mobile", "Gender", "Civil status", "Date of birth", "Consent",
      "Q1 Saving for", "Q2 Top 3", "Q3 Household role", "Q4 Dependents", "Q5 Money kept in", "Q6 Satisfaction",
      "Q7 Retirement", "Q8 Emergency cover", "Q9 Interested", "Q10 Contact by", "Preferred time"];
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map(({ data: { answers: a, contact: c, consent }, ...r }) => [
      when(r.created_at), evName.get(r.event_id) ?? r.event_id, r.advisor, c.name, c.mobile, c.gender, c.civilStatus, c.birthDate,
      consent ? "Yes" : "No", [...a.saving, a.savingOther].filter(Boolean).join("; "), a.ranked.join("; "), a.role, a.dependents,
      [...a.where, a.whereOther].filter(Boolean).join("; "), a.satisfied, a.retirement, a.emergency, a.interest,
      a.contactBy.join("; "), a.contactWhen,
    ].map(cell).join(","));
    const blob = new Blob(["﻿" + [head.map(cell).join(","), ...lines].join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `survey-${filter ? (evName.get(filter) ?? "event").replace(/[^\w-]+/g, "-") : "all"}.csv`;
    link.click();
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 md:px-8">
      <header className="flex items-center justify-between">
        <img src="/supernova-logo.png" alt="Supernova" className="h-6 w-auto" />
        <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium">
          <ArrowLeft size={15} /> Back to the survey
        </Link>
      </header>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">Survey admin</h1>
      <div className="mt-2 h-1 w-12 rounded bg-accent" />
      {error && <p className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>}
      {notice && (
        <p className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          {notice}<button onClick={() => setNotice("")} className="text-muted underline">Dismiss</button>
        </p>
      )}

      {requests.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-semibold">Reassignment requests ({requests.length})</h2>
          <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-accent-line bg-surface">
            {requests.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{q.lead_name || "No name given"} <span className="text-sm font-normal text-muted">· {q.event_name}</span></div>
                  <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
                    {q.current_advisor} <ArrowRight size={14} /> <b className="font-medium text-foreground">{q.to_advisor}</b>
                    · requested by {q.requested_by} · {when(q.created_at)}
                  </div>
                  {q.note && <div className="mt-0.5 text-sm">&ldquo;{q.note}&rdquo;</div>}
                </div>
                <button onClick={() => decide(q.id, false)} className="h-9 rounded-full border border-line px-4 text-sm">Decline</button>
                <button onClick={() => decide(q.id, true)} className="h-9 rounded-full bg-foreground px-4 text-sm font-medium text-white">Approve</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold">Events</h2>
        <div className="mt-3 grid gap-3 rounded-xl border border-line bg-surface p-4 md:grid-cols-[1fr_160px_1fr_minmax(17rem,1.2fr)_auto] md:items-end">
          <label className="text-sm text-muted">Venue
            <input value={venue} onChange={(e) => { setVenue(e.target.value); setName(suggestName(e.target.value, date)); }}
              placeholder="San Beda" className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-foreground" />
          </label>
          <label className="text-sm text-muted">Date
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setName(suggestName(venue, e.target.value)); }}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 text-foreground" />
          </label>
          <label className="text-sm text-muted">Event name, as advisors will see it
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-foreground" />
          </label>
          <label className="text-sm text-muted">Survey
            <select value={survey} onChange={(e) => setSurvey(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 text-foreground">
              {SURVEYS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <button onClick={() => { saveEvent({ name, date, venue, survey }); setVenue(""); setDate(""); setName(""); }} disabled={!name.trim()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-foreground px-4 font-medium text-white disabled:opacity-40">
            <Plus size={16} /> Add event
          </button>
        </div>
        {events.length > 0 && (
          <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {events.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{e.name}</div>
                  <div className="text-sm text-muted">{surveyLabel(e.survey)} · {e.responses} surveys · {e.active ? "Open to advisors" : "Closed"}</div>
                </div>
                {/* The team leader owns surveys respondents answer themselves from the QR code. */}
                <label className="flex items-center gap-2 text-sm text-muted">Team leader
                  <select value={e.leader ?? ""} onChange={(x) => saveEvent({ id: e.id, name: e.name, venue: e.venue, leader: x.target.value })}
                    className="h-9 max-w-48 rounded-lg border border-line bg-white px-2 text-foreground">
                    <option value="">None (QR off)</option>
                    {[...(e.leader && !advisors.includes(e.leader) ? [e.leader] : []), ...advisors].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <input key={`${e.id}-${e.leader_mobile}`} defaultValue={e.leader_mobile} inputMode="tel" placeholder="Leader's mobile"
                  onBlur={(x) => x.target.value.trim() !== e.leader_mobile && saveEvent({ id: e.id, name: e.name, venue: e.venue, leaderMobile: x.target.value })}
                  className="h-9 w-36 rounded-lg border border-line bg-white px-2 text-sm" />
                <a href={`/event-qr/${e.id}`} target="_blank" rel="noopener"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm"><QrCode size={15} /> QR code</a>
                <a href={`/raffle/${e.id}`} target="_blank" rel="noopener"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm"><Ticket size={15} /> Raffle names</a>
                {SURVEYS.length > 1 && (
                  <select value={e.survey} onChange={(x) => saveEvent({ id: e.id, name: e.name, venue: e.venue, survey: x.target.value })}
                    className="h-9 rounded-lg border border-line bg-white px-2 text-sm">
                    {SURVEYS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                )}
                <button onClick={() => saveEvent({ id: e.id, name: e.name, venue: e.venue, active: !e.active })}
                  className="h-9 rounded-full border border-line px-3 text-sm">{e.active ? "Close" : "Reopen"}</button>
                <button onClick={() => purge(e)} aria-label={`Delete all surveys from ${e.name}`} title="Delete all surveys"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-accent"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Move leads</h2>
        <div className="mt-3 grid gap-3 rounded-xl border border-line bg-surface p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <label className="text-sm text-muted">From
            <select value={moveFrom} onChange={(e) => setMoveFrom(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 text-foreground">
              <option value="">Choose an advisor</option>
              {owners.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label className="text-sm text-muted">To
            <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 text-foreground">
              <option value="">Choose an advisor</option>
              {advisors.filter((x) => x !== moveFrom).map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="text-sm text-muted">Which leads
            <select value={moveEvent} onChange={(e) => setMoveEvent(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 text-foreground">
              <option value="">All events</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <button onClick={moveAll} disabled={!moveFrom || !moveTo}
            className="h-11 rounded-lg bg-foreground px-4 font-medium text-white disabled:opacity-40">Move leads</button>
        </div>
        <p className="mt-2 text-xs text-muted">The From list shows advisors with leads in the surveys listed below. To move a single lead, open it below and change its owner or its event.</p>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex-1 font-display text-lg font-semibold">Surveys ({rows.length})</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-lg border border-line bg-white px-2">
            <option value="">All events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={exportCsv} disabled={!rows.length}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium disabled:opacity-40">
            <Download size={15} /> Export CSV
          </button>
        </div>
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {!rows.length && <p className="px-4 py-6 text-center text-sm text-muted">No surveys yet.</p>}
          {rows.map((r) => {
            const { answers: a, contact: c, consent } = r.data;
            return (
              <div key={r.id} className="px-4 py-3">
                <button onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-start gap-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{c.name || "No name given"}{c.mobile && <span className="text-muted"> · {c.mobile}</span>}
                      {r.data.source === "qr" && <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs text-muted">Scanned QR</span>}</div>
                    <div className="text-sm text-muted">
                      {when(r.created_at)} · {evName.get(r.event_id) ?? ""} · Top: {a.ranked[0] ?? "-"} · {a.interest || "-"}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{r.advisor}</div>
                    {r.reassigned_from && <div className="text-xs text-muted">was {r.reassigned_from}</div>}
                  </div>
                </button>
                {open === r.id && (
                  <div className="mt-3 grid gap-x-6 gap-y-1 rounded-lg bg-background p-3 text-sm md:grid-cols-2">
                    <div><b>Saving for:</b> {[...a.saving, a.savingOther].filter(Boolean).join(", ") || "-"}</div>
                    <div><b>Top 3:</b> {a.ranked.join(", ") || "-"}</div>
                    <div><b>Household role:</b> {a.role || "-"}</div>
                    <div><b>Dependents:</b> {a.dependents || "-"}</div>
                    <div><b>Money kept in:</b> {[...a.where, a.whereOther].filter(Boolean).join(", ") || "-"}</div>
                    <div><b>Satisfaction:</b> {a.satisfied || "-"}</div>
                    <div><b>Retirement:</b> {a.retirement || "-"}</div>
                    <div><b>Emergency cover:</b> {a.emergency || "-"}</div>
                    <div><b>Contact by:</b> {a.contactBy.join(", ") || "-"} {a.contactWhen && `(${a.contactWhen})`}</div>
                    <div><b>Details:</b> {[c.gender, c.civilStatus, c.birthDate].filter(Boolean).join(", ") || "-"} · Consent: {consent ? "Yes" : "No"}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 md:col-span-2">
                      <label className="flex items-center gap-2">
                        <span className="text-muted">Owner</span>
                        <select value={r.advisor} onChange={(e) => reassign(r.id, e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2">
                          {[r.advisor, ...advisors.filter((x) => x !== r.advisor)].map((x) => <option key={x}>{x}</option>)}
                        </select>
                      </label>
                      <label className="flex items-center gap-2">
                        <span className="text-muted">Event</span>
                        <select value={r.event_id} onChange={(e) => changeEvent(r, e.target.value)} className="h-9 max-w-64 rounded-lg border border-line bg-white px-2">
                          {!evName.has(r.event_id) && <option value={r.event_id}>{r.data.eventName ?? "Unknown event"}</option>}
                          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
