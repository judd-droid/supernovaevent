import { db, notConfigured } from "@/lib/db";
import { access, keyOk, mayRequest } from "@/lib/leads-access";
import { loggerOf } from "@/lib/bigboard";

// A leader (any lead in their unit) or an event's team leader (that event's QR
// leads) moves a lead to another advisor on the same Logger. It takes effect at once.
export async function POST(req: Request) {
  if (!keyOk(req)) return Response.json({ error: "Not allowed" }, { status: 401 });
  const sql = await db();
  if (!sql) return notConfigured();
  const b = (await req.json().catch(() => ({}))) as { advisor?: string; id?: string; to?: string; note?: string };
  const advisor = String(b.advisor ?? "").trim();
  const to = String(b.to ?? "").trim();
  if (!advisor || !b.id || !to) return Response.json({ error: "Missing details." }, { status: 400 });

  const rows = await sql`SELECT advisor, data FROM responses WHERE id = ${b.id}`;
  const lead = rows[0] as { advisor: string; data: { source?: string } } | undefined;
  if (!lead) return Response.json({ error: "That lead no longer exists." }, { status: 404 });
  const { all, leader, names } = await access(advisor, true);
  if (!names.includes(lead.advisor.toLowerCase()) || !mayRequest(advisor, leader, { advisor: lead.advisor, source: lead.data?.source })) {
    return Response.json({ error: "You can't ask to move this lead." }, { status: 403 });
  }
  const target = all.find((a) => a.advisor.toLowerCase() === to.toLowerCase());
  if (!target) return Response.json({ error: "That advisor isn't on the roster." }, { status: 400 });
  const me = all.find((a) => a.advisor.toLowerCase() === advisor.toLowerCase());
  if (loggerOf(target) !== loggerOf(me)) return Response.json({ error: "Leads can only move to advisors on your Logger." }, { status: 400 });
  if (target.advisor.toLowerCase() === lead.advisor.toLowerCase()) return Response.json({ error: "The lead is already theirs." }, { status: 400 });

  // Leaders and team leaders move leads directly (AD decision, Nov 5, 2026). The
  // move is logged as a request that was approved at once, so admin keeps a record.
  await sql`UPDATE responses SET reassigned_from = COALESCE(reassigned_from, advisor), advisor = ${target.advisor} WHERE id = ${b.id}`;
  await sql`UPDATE reassign_requests SET status = 'superseded', decided_at = now() WHERE response_id = ${b.id} AND status = 'pending'`;
  await sql`INSERT INTO reassign_requests (id, response_id, from_advisor, to_advisor, requested_by, note, status, decided_at)
            VALUES (${crypto.randomUUID()}, ${b.id}, ${lead.advisor}, ${target.advisor}, ${advisor}, ${String(b.note ?? "").slice(0, 300)}, 'moved', now())`;
  return Response.json({ ok: true, moved: true, to: target.advisor });
}
