import { db, notConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

// Every survey, newest first, optionally for one event.
export async function GET(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const event = new URL(req.url).searchParams.get("event");
  const rows = event
    ? await sql`SELECT id, event_id, advisor, data, created_at, reassigned_from FROM responses WHERE event_id = ${event} ORDER BY created_at DESC`
    : await sql`SELECT id, event_id, advisor, data, created_at, reassigned_from FROM responses ORDER BY created_at DESC LIMIT 2000`;
  return Response.json({ responses: rows });
}

// Move a survey to another advisor ({ id, advisor }), or every survey of one
// advisor ({ from, advisor }, optionally only for { event }). Any request still
// waiting for a moved survey is closed, since the AD has decided.
export async function PATCH(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const b = (await req.json().catch(() => ({}))) as { id?: string; from?: string; event?: string; advisor?: string };
  const advisor = String(b.advisor ?? "").trim();
  if (!advisor || (!b.id && !b.from)) return Response.json({ error: "Missing survey or advisor." }, { status: 400 });
  const moved = b.id
    ? await sql`UPDATE responses SET reassigned_from = COALESCE(reassigned_from, advisor), advisor = ${advisor}
                WHERE id = ${b.id} AND advisor <> ${advisor} RETURNING id`
    : await sql`UPDATE responses SET reassigned_from = COALESCE(reassigned_from, advisor), advisor = ${advisor}
                WHERE lower(advisor) = lower(${String(b.from)}) AND advisor <> ${advisor}
                  AND (${b.event ?? null}::text IS NULL OR event_id = ${b.event ?? null}) RETURNING id`;
  const ids = moved.map((r) => r.id as string);
  if (ids.length) {
    await sql`UPDATE reassign_requests SET status = 'superseded', decided_at = now() WHERE response_id = ANY(${ids}) AND status = 'pending'`;
  }
  return Response.json({ ok: true, moved: ids.length });
}
