"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, Printer } from "lucide-react";
import { channel, CHANNEL_LABEL, contactable, pct, POINTS, report, short, type Count, type StatRow } from "@/lib/stats";
import { surveyLabel } from "@/lib/surveys";

type Ev = { id: string; name: string; date: string | null; venue: string; active: boolean; survey: string; leader: string | null };

// One data hue (charcoal) for every bar; red marks only the bar a chart is about.
const BAR = "#3d444b";
const HL = "var(--accent)";

// The (i) beside "Who to call first": the point system, on hover, focus or tap.
function PointsInfo() {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex print:hidden" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen((v) => !v)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        aria-label="How points are counted" aria-expanded={open}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-foreground">
        <Info size={16} />
      </button>
      {open && (
        <span role="tooltip" className="absolute left-5 top-12 z-20 w-[min(24rem,calc(100%-2.5rem))] rounded-lg border border-line bg-surface p-3 text-left font-sans text-sm font-normal leading-snug shadow-lg">
          <span className="block font-medium">How points are counted</span>
          <span className="mt-2 grid gap-1">
            {POINTS.map((p) => (
              <span key={p.text} className="flex justify-between gap-3">
                <span>{p.text}</span><span className="shrink-0 tabular-nums text-muted">+{p.pts}</span>
              </span>
            ))}
          </span>
          <span className="mt-2 block text-muted">Only leads who left contact details are listed. Highest points first; ties go to whoever answered first.</span>
        </span>
      )}
    </span>
  );
}

function Card({ title, info, note, children, wide }: { title: string; info?: React.ReactNode; note?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`relative break-inside-avoid rounded-xl border border-line bg-surface p-5 ${wide ? "md:col-span-2" : ""}`}>
      <h2 className="flex items-center gap-1.5 font-display text-base font-semibold">{title}{info}</h2>
      {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 font-display text-3xl font-semibold tabular-nums ${accent ? "text-accent" : ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-sm text-muted">{sub}</div>}
    </div>
  );
}

// Horizontal bars: label, bar from a shared baseline, then count and share.
function Bars({ data, of, hl, max }: { data: Count[]; of: number; hl?: string; max?: number }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.n));
  if (!data.some((d) => d.n)) return <p className="text-sm text-muted">No answers yet.</p>;
  return (
    <div className="grid gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-sm" title={`${d.label}: ${d.n} (${pct(d.n, of)}%)`}>
          <div className="truncate text-foreground">{d.label}</div>
          <div className="h-3">
            {d.n > 0 && <div className="h-3 rounded-r" style={{ width: `${Math.max(2, (d.n / top) * 100)}%`, background: d.label === hl ? HL : BAR }} />}
          </div>
          <div className="w-20 text-right tabular-nums text-muted"><span className="text-foreground">{d.n}</span> · {pct(d.n, of)}%</div>
        </div>
      ))}
    </div>
  );
}

// Columns for surveys per hour.
function Columns({ data }: { data: Count[] }) {
  const top = Math.max(1, ...data.map((d) => d.n));
  const peak = data.reduce((p, d) => (d.n > p.n ? d : p), data[0]);
  return (
    <div>
      <div className="flex h-40 items-end gap-[2px] border-b border-line">
        {data.map((d) => (
          <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${d.label}: ${d.n} surveys`}>
            {d.n > 0 && <div className="mb-1 text-xs tabular-nums text-muted">{d.n}</div>}
            <div className="w-full max-w-6 rounded-t" style={{ height: `${(d.n / top) * 100}%`, minHeight: d.n ? 2 : 0, background: d === peak ? HL : BAR }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {data.map((d) => <div key={d.label} className="min-w-0 flex-1 truncate text-center text-[11px] text-muted">{d.label}</div>)}
      </div>
    </div>
  );
}

export default function Stats({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ev, setEv] = useState<Ev | null>(null);
  const [rows, setRows] = useState<StatRow[] | null>(null);
  const [error, setError] = useState("");
  const [allFollow, setAllFollow] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/events").then((r) => r.json()),
      fetch(`/api/admin/responses?event=${encodeURIComponent(id)}`).then((r) => r.json()),
    ]).then(([e, r]) => {
      const found = (e.events ?? []).find((x: Ev) => x.id === id);
      if (!found) return setError(e.error ?? "Event not found.");
      setEv(found);
      setRows(r.responses ?? []);
      if (r.error) setError(r.error);
    }).catch(() => setError("Couldn't reach the server."));
  }, [id]);

  const r = useMemo(() => (rows && ev ? report(rows, ev.date ? new Date(`${ev.date}T12:00:00+08:00`) : new Date()) : null), [rows, ev]);

  if (error) return <main className="mx-auto max-w-5xl px-5 py-10"><p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p></main>;
  if (!ev || !r || !rows) return <main className="mx-auto max-w-5xl px-5 py-10 text-sm text-muted">Loading the report…</main>;

  const follow = allFollow ? r.follow : r.follow.slice(0, 15);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 md:px-8 print:max-w-none print:p-0">
      <header className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/admin" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium">
          <ArrowLeft size={15} /> Back to admin
        </Link>
        <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium">
          <Printer size={15} /> Print or save as PDF
        </button>
      </header>

      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">{ev.name}</h1>
      <div className="mt-2 h-1 w-12 rounded bg-accent" />
      <p className="mt-3 text-sm text-muted">
        Event report · {surveyLabel(ev.survey)}{ev.leader ? ` · Team leader: ${ev.leader}` : ""} · {ev.active ? "Open" : "Closed"}
      </p>

      {!r.total ? (
        <p className="mt-8 rounded-xl border border-line bg-surface px-4 py-8 text-center text-muted">No surveys for this event yet.</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Tile label="Surveys" value={r.total} />
            <Tile label="Leads" value={r.leads} sub={`${pct(r.leads, r.total)}% left details`} />
            <Tile label="Said yes" value={r.yes} sub={`${pct(r.yes, r.total)}% of surveys`} accent />
            <Tile label="Want more info" value={r.maybe} sub={`${pct(r.maybe, r.total)}% of surveys`} />
            <Tile label="To call this week" value={r.hot} sub="Leads who said yes or maybe" />
          </div>

          {r.takeaways.length > 0 && (
            <section className="mt-6 rounded-xl border border-line bg-surface p-5">
              <h2 className="font-display text-base font-semibold">Takeaways</h2>
              <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-[15px] leading-relaxed">
                {r.takeaways.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </section>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="From survey to conversation" note="How many respondents reached each step.">
              <Bars of={r.total} hl="Said yes" data={[
                { label: "Answered the survey", n: r.total },
                { label: "Left contact details", n: r.leads },
                { label: "Said yes or maybe", n: r.yes + r.maybe },
                { label: "Said yes", n: r.yes },
              ]} />
            </Card>

            <Card title="When surveys came in" note="Surveys per hour. The busiest hour is in red.">
              {r.byHour.length ? <Columns data={r.byHour} /> : <p className="text-sm text-muted">No times recorded.</p>}
            </Card>

            <Card title="Who to call first" info={<PointsInfo />} note="Leads ranked by points for interest and need; ties go to whoever answered first. Reasons show what to open the conversation with." wide>
              {!r.follow.length ? <p className="text-sm text-muted">No leads with contact details yet.</p> : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[58rem] text-left text-sm">
                      <thead className="text-muted">
                        <tr className="border-b border-line">
                          <th className="py-2.5 pr-6 font-medium">#</th><th className="py-2.5 pr-6 font-medium">Name</th><th className="py-2.5 pr-6 font-medium">Mobile</th>
                          <th className="py-2.5 pr-6 font-medium">Owner</th><th className="py-2.5 pr-6 font-medium">Prefers</th>
                          <th className="py-2.5 pr-6 text-right font-medium">Points</th><th className="py-2.5 font-medium">Why call</th>
                        </tr>
                      </thead>
                      <tbody>
                        {follow.map((f, i) => {
                          const a = f.row.data.answers, c = f.row.data.contact;
                          return (
                            <tr key={f.row.id} className="border-b border-line align-top last:border-0">
                              <td className="py-2.5 pr-6 tabular-nums text-muted">{i + 1}</td>
                              <td className="py-2.5 pr-6 font-medium">{c.name || "No name"}</td>
                              <td className="whitespace-nowrap py-2.5 pr-6 tabular-nums">{c.mobile || "-"}</td>
                              <td className="py-2.5 pr-6">{f.row.advisor}</td>
                              <td className="py-2.5 pr-6 text-muted">{[a.contactBy.map(short).join(", "), a.contactWhen].filter(Boolean).join(" · ") || "-"}</td>
                              <td className="py-2.5 pr-6 text-right font-semibold tabular-nums">{f.score}</td>
                              <td className="py-2.5">
                                {f.reasons.map((x, j) => (
                                  <span key={x.text}>{j > 0 && " · "}{x.text} <span className="whitespace-nowrap tabular-nums text-muted">+{x.pts}</span></span>
                                ))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {r.follow.length > 15 && (
                    <button onClick={() => setAllFollow((v) => !v)} className="mt-3 text-sm text-muted underline print:hidden">
                      {allFollow ? "Show the top 15" : `Show all ${r.follow.length}`}
                    </button>
                  )}
                </>
              )}
            </Card>

            <Card title="By advisor" note="Surveys each advisor owns now, including leads moved to them." wide>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="text-muted">
                    <tr className="border-b border-line">
                      <th className="py-2.5 pr-6 font-medium">Advisor</th><th className="py-2.5 pr-6 font-medium">Surveys</th>
                      <th className="py-2.5 pr-6 font-medium">Leads</th><th className="py-2.5 pr-6 font-medium">Left details</th>
                      <th className="py-2.5 pr-6 font-medium">Yes</th><th className="py-2.5 font-medium">Maybe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.byAdvisor.map((a) => (
                      <tr key={a.advisor} className="border-b border-line last:border-0">
                        <td className="py-2.5 pr-6 font-medium">{a.advisor}{a.moved ? <span className="ml-1 text-xs font-normal text-muted">({a.moved} moved in)</span> : null}</td>
                        <td className="py-2.5 pr-6">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 rounded-r" style={{ width: `${(a.surveys / r.byAdvisor[0].surveys) * 6}rem`, background: BAR }} />
                            <span className="tabular-nums">{a.surveys}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-6 tabular-nums">{a.leads}</td>
                        <td className="py-2.5 pr-6 tabular-nums text-muted">{pct(a.leads, a.surveys)}%</td>
                        <td className="py-2.5 pr-6 tabular-nums">{a.yes}</td>
                        <td className="py-2.5 tabular-nums">{a.maybe}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {r.channels.length > 1 && (
              <Card title="How surveys came in" note="Where respondents answered, and how often each way left details." wide>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-left text-sm">
                    <thead className="text-muted">
                      <tr className="border-b border-line">
                        <th className="py-2.5 pr-6 font-medium">Channel</th><th className="py-2.5 pr-6 font-medium">Surveys</th>
                        <th className="py-2.5 pr-6 font-medium">Left details</th><th className="py-2.5 font-medium">Said yes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.channels.map((c) => (
                        <tr key={c.key} className="border-b border-line last:border-0">
                          <td className="py-2.5 pr-6 font-medium">{c.label}</td>
                          <td className="py-2.5 pr-6 tabular-nums">{c.surveys} <span className="text-muted">· {pct(c.surveys, r.total)}%</span></td>
                          <td className="py-2.5 pr-6 tabular-nums">{pct(c.leads, c.surveys)}%</td>
                          <td className="py-2.5 tabular-nums">{pct(c.yes, c.surveys)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <Card title="Goals: priority versus action" note="How many rank each goal in their top 3, and how many of them aren't saving for it yet. The gap is the opening." wide>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="text-muted">
                    <tr className="border-b border-line">
                      <th className="py-2.5 pr-6 font-medium">Goal</th><th className="py-2.5 pr-6 font-medium">In top 3</th>
                      <th className="py-2.5 pr-6 font-medium">Ranked first</th><th className="py-2.5 pr-6 font-medium">Saving for it</th>
                      <th className="py-2.5 font-medium">Top-3 but not saving</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.goals.map((g) => {
                      const gapPct = pct(g.unfunded, g.top3);
                      const worst = r.goals.filter((x) => x.top3 >= 3).sort((a, b) => b.unfunded / b.top3 - a.unfunded / a.top3)[0]?.goal === g.goal;
                      return (
                        <tr key={g.goal} className="border-b border-line last:border-0">
                          <td className="py-2.5 pr-6 font-medium">{g.goal}</td>
                          <td className="py-2.5 pr-6">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 rounded-r" style={{ width: `${(g.top3 / Math.max(1, r.goals[0].top3)) * 6}rem`, background: BAR }} />
                              <span className="tabular-nums">{g.top3}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-6 tabular-nums">{g.first}</td>
                          <td className="py-2.5 pr-6 tabular-nums">{g.saving}</td>
                          <td className={`py-2 tabular-nums ${worst && g.unfunded ? "font-semibold text-accent" : ""}`}>{g.unfunded}{g.top3 ? ` · ${gapPct}%` : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Opportunity groups" note="Respondents whose answers point to a clear need. Some fall in more than one group." wide>
              <div className="grid gap-3 md:grid-cols-2">
                {r.groups.filter((g) => g.rows.length).map((g) => {
                  const leads = g.rows.filter(contactable);
                  const warm = leads.filter((x) => x.data.answers.interest === "Yes" || x.data.answers.interest.startsWith("Maybe"));
                  return (
                    <div key={g.key} className="rounded-lg border border-line p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="font-medium">{g.label}</div>
                        <div className="shrink-0 font-display text-2xl font-semibold tabular-nums">{g.rows.length}</div>
                      </div>
                      <div className="mt-1 text-sm text-muted">{g.why}</div>
                      <div className="mt-2 text-sm">{pct(g.rows.length, r.total)}% of respondents · {leads.length} with contact details · {warm.length} said yes or maybe</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Interest in a conversation">
              <Bars data={r.interest} of={r.total} hl="Yes" />
            </Card>
            <Card title="How leads want to be contacted" note="Among leads who left details. Several allowed.">
              <Bars data={r.contactBy} of={r.leads} />
            </Card>

            <Card title="Emergency cushion" note="How long savings would cover expenses if the main income stopped.">
              <Bars data={r.emergency} of={r.total} hl="Less than one month" />
            </Card>
            <Card title="Retirement preparation">
              <Bars data={r.retirement} of={r.total} />
            </Card>
            <Card title="Satisfaction with savings">
              <Bars data={r.satisfied} of={r.total} />
            </Card>
            <Card title="Where they keep their money" note="Several allowed.">
              <Bars data={r.where} of={r.total} />
            </Card>

            <Card title="Household role">
              <Bars data={r.role} of={r.total} />
            </Card>
            <Card title="Dependents">
              <Bars data={r.dependents} of={r.total} />
            </Card>
            <Card title="Age" note={`From ${r.agesKnown} respondents who gave a date of birth.`}>
              <Bars data={r.ageBands} of={r.agesKnown} />
            </Card>
            <Card title="Gender and civil status" note="From respondents who gave them.">
              <Bars data={[...r.gender, ...r.civil]} of={r.total} />
            </Card>
          </div>

          <p className="mt-6 text-xs text-muted">
            {rows.filter((x) => channel(x) !== "device").length} of {r.total} surveys came from QR scans ({Object.values(CHANNEL_LABEL).slice(1).join(" or ")}).
            Report as of {new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date())}.
          </p>
        </>
      )}
    </main>
  );
}
