import { db, notConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = await db();
  if (!sql) return notConfigured();
  const events = await sql`SELECT e.id, e.name, to_char(e.date, 'YYYY-MM-DD') AS date, e.venue, e.active,
                                  (SELECT count(*)::int FROM responses r WHERE r.event_id = e.id) AS responses
                           FROM events e ORDER BY e.date DESC NULLS LAST, e.created_at DESC`;
  return Response.json({ events });
}

// Create an event, or update one (name, date, venue, open or closed).
export async function POST(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const b = (await req.json().catch(() => ({}))) as { id?: string; name?: string; date?: string; venue?: string; active?: boolean };
  const name = String(b.name ?? "").trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? String(b.date) : null;
  const venue = String(b.venue ?? "").trim();
  if (b.id) {
    await sql`UPDATE events SET name = COALESCE(NULLIF(${name}, ''), name), date = COALESCE(${date}::date, date),
              venue = ${venue}, active = COALESCE(${b.active ?? null}::boolean, active) WHERE id = ${b.id}`;
    return Response.json({ ok: true, id: b.id });
  }
  if (!name) return Response.json({ error: "Give the event a name." }, { status: 400 });
  const id = crypto.randomUUID();
  await sql`INSERT INTO events (id, name, date, venue) VALUES (${id}, ${name}, ${date}::date, ${venue})`;
  return Response.json({ ok: true, id });
}
