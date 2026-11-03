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

// Move a survey to another advisor (it was taken under the wrong name).
export async function PATCH(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const b = (await req.json().catch(() => ({}))) as { id?: string; advisor?: string };
  const advisor = String(b.advisor ?? "").trim();
  if (!b.id || !advisor) return Response.json({ error: "Missing survey or advisor." }, { status: 400 });
  await sql`UPDATE responses SET reassigned_from = COALESCE(reassigned_from, advisor), advisor = ${advisor}
            WHERE id = ${b.id} AND advisor <> ${advisor}`;
  return Response.json({ ok: true });
}
