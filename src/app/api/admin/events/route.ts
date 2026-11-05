import { db, notConfigured } from "@/lib/db";
import { DEFAULT_SURVEY, isSurvey } from "@/lib/surveys";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = await db();
  if (!sql) return notConfigured();
  const events = await sql`SELECT e.id, e.name, to_char(e.date, 'YYYY-MM-DD') AS date, e.venue, e.active, e.survey, e.leader, e.leader_mobile, e.public_token,
                                  (SELECT count(*)::int FROM responses r WHERE r.event_id = e.id) AS responses
                           FROM events e ORDER BY e.date DESC NULLS LAST, e.created_at DESC`;
  return Response.json({ events });
}

// Create an event, or update one (name, date, venue, survey, open or closed, and
// the team leader who owns surveys answered through the event's QR code).
export async function POST(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const b = (await req.json().catch(() => ({}))) as { id?: string; name?: string; date?: string; venue?: string; active?: boolean; survey?: string;
    leader?: string; leaderMobile?: string };
  const name = String(b.name ?? "").trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? String(b.date) : null;
  const venue = String(b.venue ?? "").trim();
  const survey = isSurvey(b.survey) ? b.survey : null;
  if (b.id) {
    await sql`UPDATE events SET name = COALESCE(NULLIF(${name}, ''), name), date = COALESCE(${date}::date, date),
              venue = ${venue}, active = COALESCE(${b.active ?? null}::boolean, active),
              survey = COALESCE(${survey}, survey) WHERE id = ${b.id}`;
    if (b.leader !== undefined) {
      await sql`UPDATE events SET leader = NULLIF(${String(b.leader).trim()}, '') WHERE id = ${b.id}`;
    }
    if (b.leaderMobile !== undefined) {
      await sql`UPDATE events SET leader_mobile = ${String(b.leaderMobile).trim()} WHERE id = ${b.id}`;
    }
    return Response.json({ ok: true, id: b.id });
  }
  if (!name) return Response.json({ error: "Give the event a name." }, { status: 400 });
  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await sql`INSERT INTO events (id, name, date, venue, survey, public_token)
            VALUES (${id}, ${name}, ${date}::date, ${venue}, ${survey ?? DEFAULT_SURVEY}, ${token})`;
  return Response.json({ ok: true, id });
}

// Delete an event. Only an event with no surveys left: its surveys (leads) are
// deleted first, separately, so leads are never lost by deleting an event.
export async function DELETE(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const left = await sql`SELECT count(*)::int AS n FROM responses WHERE event_id = ${id}`;
  if (left[0]?.n > 0) {
    return Response.json({ error: `This event still has ${left[0].n} surveys. Move them to another event or delete them first.` }, { status: 409 });
  }
  const gone = await sql`DELETE FROM events WHERE id = ${id} RETURNING id`;
  if (!gone.length) return Response.json({ error: "Event not found." }, { status: 404 });
  return Response.json({ ok: true });
}
