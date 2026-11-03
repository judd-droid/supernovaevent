import { db, notConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

// Reassignment requests waiting for the AD, with the lead they're about.
export async function GET() {
  const sql = await db();
  if (!sql) return notConfigured();
  const requests = await sql`SELECT q.id, q.response_id, q.from_advisor, q.to_advisor, q.requested_by, q.note, q.created_at,
                                    r.data->'contact'->>'name' AS lead_name, e.name AS event_name, r.advisor AS current_advisor
                             FROM reassign_requests q
                             JOIN responses r ON r.id = q.response_id
                             LEFT JOIN events e ON e.id = r.event_id
                             WHERE q.status = 'pending' ORDER BY q.created_at`;
  return Response.json({ requests });
}

// Approve (moves the lead) or decline a request.
export async function POST(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const b = (await req.json().catch(() => ({}))) as { id?: string; approve?: boolean };
  const rows = await sql`SELECT response_id, to_advisor FROM reassign_requests WHERE id = ${b.id ?? ""} AND status = 'pending'`;
  const q = rows[0];
  if (!q) return Response.json({ error: "That request was already handled." }, { status: 404 });
  if (b.approve) {
    await sql`UPDATE responses SET reassigned_from = COALESCE(reassigned_from, advisor), advisor = ${q.to_advisor}
              WHERE id = ${q.response_id}`;
  }
  await sql`UPDATE reassign_requests SET status = ${b.approve ? "approved" : "declined"}, decided_at = now() WHERE id = ${b.id}`;
  return Response.json({ ok: true });
}
