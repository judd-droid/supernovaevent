import { db, notConfigured } from "@/lib/db";

// Delete every survey of one event, and their reassignment requests. The Loggers
// read leads live from here, so the leads disappear there too. There's no undo.
export async function POST(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const b = (await req.json().catch(() => ({}))) as { event?: string };
  if (!b.event) return Response.json({ error: "Missing event." }, { status: 400 });
  await sql`DELETE FROM reassign_requests WHERE response_id IN (SELECT id FROM responses WHERE event_id = ${b.event})`;
  const gone = await sql`DELETE FROM responses WHERE event_id = ${b.event} RETURNING id`;
  return Response.json({ ok: true, deleted: gone.length });
}
