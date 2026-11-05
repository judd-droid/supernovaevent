import { db, notConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

// Raffle entries for an event: everyone who answered from the event's QR code and
// left a name, once each (matched by mobile, or by name when there's no mobile).
// Behind the team passcode; the page that shows them keeps the names hidden until asked.
export async function GET(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const ev = await sql`SELECT name FROM events WHERE id = ${id}`;
  if (!ev[0]) return Response.json({ error: "Event not found." }, { status: 404 });

  const rows = await sql`SELECT data->'contact'->>'name' AS name, data->'contact'->>'mobile' AS mobile
                         FROM responses
                         WHERE event_id = ${id} AND data->>'source' = 'qr'
                         ORDER BY created_at`;
  const seen = new Set<string>();
  const names: string[] = [];
  for (const r of rows) {
    const name = String(r.name ?? "").replace(/\s+/g, " ").trim();
    if (!name) continue;
    const key = String(r.mobile ?? "").replace(/\D/g, "").slice(-10) || name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return Response.json({ event: ev[0].name, names });
}
