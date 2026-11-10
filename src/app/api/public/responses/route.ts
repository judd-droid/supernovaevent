import { db, notConfigured } from "@/lib/db";
import type { Answers, Contact } from "@/lib/survey";
import { PERSONAL_TOKEN, qrAdvisor } from "@/lib/qrsign";
import { DEFAULT_SURVEY } from "@/lib/surveys";
import { clientIp, overLimit, tooMany } from "@/lib/ratelimit";

// Contact fields are kept to a sensible length.
const clip = (c: Contact | undefined): Contact | undefined => c && (Object.fromEntries(
  Object.entries(c).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 200) : v]),
) as Contact);

// A survey a respondent answered on their own phone from the event's QR code. It
// belongs to the event's team leader. The event and owner come from the server,
// never from the phone.
export async function POST(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const raw = await req.text();
  if (raw.length > 20_000) return Response.json({ error: "Too large" }, { status: 413 });
  let b: { t?: string; id?: string; answers?: Answers; contact?: Contact; consent?: boolean; website?: string; a?: string; m?: string; s?: string };
  try { b = JSON.parse(raw); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  if (b.website) return Response.json({ ok: true }); // a form-filling bot took the hidden field
  if (!b.t || !b.id || !/^[0-9a-f-]{36}$/.test(b.id) || !b.answers || typeof b.answers !== "object") return Response.json({ error: "Bad request" }, { status: 400 });
  // At most 40 surveys from one connection every 10 minutes (a booth's shared Wi-Fi
  // stays well under), and 300 a day to any one advisor's link or event code.
  if (await overLimit(`survey:ip:${clientIp(req)}`, 40, 10 * 60)) {
    return tooMany("Too many surveys from this connection. Please try again in a few minutes.");
  }
  const owner_key = b.t === PERSONAL_TOKEN ? `me:${String(b.a ?? "").toLowerCase()}` : `ev:${b.t}:${String(b.a ?? "").toLowerCase()}`;
  if (await overLimit(`survey:to:${owner_key}`, 300, 24 * 60 * 60)) {
    return tooMany("This survey link has reached today's limit. Please try again tomorrow.");
  }

  const consent = !!b.consent;
  const contact = clip(consent ? b.contact : { ...(b.contact ?? {}), name: "", mobile: "", birthDate: "" } as Contact);

  // An advisor's personal code: the lead is theirs and belongs to no event (event_id
  // is left empty, so the Loggers show no event name).
  if (b.t === PERSONAL_TOKEN) {
    const own = await qrAdvisor(b.t, b.a, b.m, b.s);
    if (!own) return Response.json({ error: "This survey link isn't valid." }, { status: 404 });
    // A personal link is open any time and can be shared widely: at most 60 an hour each.
    if (await overLimit(`survey:personal-hour:${own.advisor.toLowerCase()}`, 60, 60 * 60)) {
      return tooMany("This survey link is busy right now. Please try again in an hour.");
    }
    const data = { eventName: "", survey: DEFAULT_SURVEY, source: "qr", qr: "personal", answers: b.answers, contact, consent };
    await sql`INSERT INTO responses (id, event_id, advisor, data, created_at)
              VALUES (${b.id}, '', ${own.advisor}, ${JSON.stringify(data)}::jsonb, now())
              ON CONFLICT (id) DO NOTHING`;
    return Response.json({ ok: true });
  }

  const rows = await sql`SELECT id, name, survey, leader, active FROM events WHERE public_token = ${b.t}`;
  const e = rows[0];
  // An advisor's own (signed) code makes the lead theirs; otherwise the team leader's.
  const own = e ? await qrAdvisor(b.t, b.a, b.m, b.s) : null;
  if (!e || !e.active || (!own && !e.leader)) return Response.json({ error: "This survey isn't open right now." }, { status: 410 });
  const owner = own ? own.advisor : e.leader;

  const data = { eventName: e.name, survey: e.survey, source: "qr", qr: own ? "advisor" : "event", answers: b.answers, contact, consent };
  await sql`INSERT INTO responses (id, event_id, advisor, data, created_at)
            VALUES (${b.id}, ${e.id}, ${owner}, ${JSON.stringify(data)}::jsonb, now())
            ON CONFLICT (id) DO NOTHING`;
  return Response.json({ ok: true });
}
