import { CheckCircle2, CircleAlert, CircleDot, Lightbulb } from "lucide-react";
import { STATUS_LABEL, areas, observations, planFor, priorities, score, type Status } from "@/lib/insights";
import { answersOf, type Result } from "@/lib/result";

const STATUS_STYLE: Record<Status, { pill: string; Icon: typeof CheckCircle2 }> = {
  good: { pill: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  building: { pill: "bg-background text-muted", Icon: CircleDot },
  attention: { pill: "bg-accent-soft text-accent", Icon: CircleAlert },
};

// The Financial Wellness Snapshot (the Quick Result) itself, shown on the device after Submit and on the
// respondent's own phone from the QR code or message.
export function ResultView({ res }: { res: Result }) {
  const a = answersOf(res);
  const snapshot = areas(a);
  const notes = observations(a);
  const plans = priorities(a).map(planFor).filter((p) => p !== null);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
        {res.n ? `${res.n}, here's your Financial Wellness Snapshot` : "Your Financial Wellness Snapshot"}
      </h1>
      <div className="mt-2 h-1 w-12 rounded bg-accent" />
      <p className="mt-3 text-muted">
        Based on your answers to the Financial Wellness Survey{res.e ? ` at ${res.e}` : ""}. Thank you for taking the time.
      </p>

      {snapshot.length > 0 && (
        <section className="mt-7">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Where you stand</h2>
            {score(snapshot) > 0 && <span className="text-sm text-muted">{score(snapshot)} of {snapshot.length} on track</span>}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {snapshot.map((x) => {
              const { pill, Icon } = STATUS_STYLE[x.status];
              return (
                <div key={x.key} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium">{x.label}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${pill}`}>
                      <Icon size={13} /> {STATUS_LABEL[x.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{x.summary}</p>
                  <p className="mt-2 text-[15px] leading-snug">{x.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {notes.length > 0 && (
        <section className="mt-7 rounded-xl border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Lightbulb size={18} className="text-accent" /> What stood out</h2>
          <ul className="mt-2 space-y-2">
            {notes.map((n) => <li key={n} className="flex gap-2 text-[15px] leading-snug"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{n}</li>)}
          </ul>
        </section>
      )}

      {plans.length > 0 && (
        <section className="mt-7">
          <h2 className="font-display text-lg font-semibold">Your priorities and next steps</h2>
          <div className="mt-3 space-y-3">
            {plans.map((p, i) => (
              <div key={p.goal} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex gap-3">
                  <span className="font-display text-xl font-semibold leading-none text-accent">{i + 1}</span>
                  <div className="min-w-0">
                    <h3 className="font-medium">{p.goal}</h3>
                    <p className="mt-0.5 text-sm text-muted">{p.why}</p>
                    <ol className="mt-2 space-y-1.5">
                      {p.steps.map((s, k) => (
                        <li key={s} className="flex gap-2 text-[15px] leading-snug">
                          <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-xs text-muted">{k + 1}</span>{s}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7 rounded-xl border border-accent-line bg-accent-soft p-4">
        <h2 className="font-display text-lg font-semibold">Your next step: a free financial review</h2>
        <p className="mt-1 text-[15px] leading-snug">
          In about 30 minutes, your advisor can turn this snapshot into a plan with amounts and timelines for each goal.
          It&rsquo;s free, with no obligation. It helps to bring a rough idea of your monthly income and expenses, and any
          insurance or HMO you already have.
        </p>
        <div className="mt-3 rounded-lg bg-surface px-4 py-3">
          <div className="text-sm text-muted">Your financial advisor</div>
          <div className="font-display text-lg font-semibold">{res.a}</div>
          {res.m && <a href={`tel:${res.m.replace(/\s/g, "")}`} className="text-accent">{res.m}</a>}
        </div>
      </section>

      <p className="mt-5 text-xs text-muted">
        This snapshot is general guidance based on your answers, not financial advice. Your advisor can look at your full situation.
      </p>
    </div>
  );
}
