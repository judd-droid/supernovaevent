import { db, notConfigured } from "@/lib/db";
import { access, keyOk, mayRequest } from "@/lib/leads-access";
import { loggerOf } from "@/lib/bigboard";

export const dynamic = "force-dynamic";

// For the Loggers' Leads page, server to server: the Logger checks the advisor's
// sign-in, then asks here with LEADS_API_KEY for that advisor's leads.
// ?advisor=<Roster name> returns their own; add &scope=unit and a leader gets
// every lead taken by advisors in their unit. Each lead says whether this person
// may ask for it to be moved, and any request already waiting.
export async function GET(req: Request) {
  if (!keyOk(req)) return Response.json({ error: "Not allowed" }, { status: 401 });
  const sql = await db();
  if (!sql) return notConfigured();
  const params = new URL(req.url).searchParams;
  const advisor = (params.get("advisor") ?? "").trim();
  if (!advisor) return Response.json({ error: "Missing advisor" }, { status: 400 });

  const { all, leader, names, scope } = await access(advisor, params.get("scope") === "unit");
  const rows = await sql`SELECT r.id, r.advisor, r.data, r.created_at, e.name AS event_name, to_char(e.date, 'YYYY-MM-DD') AS event_date,
                                q.to_advisor AS requested_to
                         FROM responses r
                         LEFT JOIN events e ON e.id = r.event_id
                         LEFT JOIN reassign_requests q ON q.response_id = r.id AND q.status = 'pending'
                         WHERE lower(r.advisor) = ANY(${names}) ORDER BY r.created_at DESC`;
  const leads = rows.map((r) => ({
    ...r,
    can_request: mayRequest(advisor, leader, { advisor: r.advisor as string, source: (r.data as { source?: string })?.source }),
  }));
  const canAny = leads.some((l) => l.can_request);
  // Leads move only to advisors on the same Logger (Spartans to Spartans).
  const mine = loggerOf(all.find((a) => a.advisor.toLowerCase() === advisor.toLowerCase()));
  const targets = all.filter((a) => loggerOf(a) === mine).map((a) => a.advisor);
  return Response.json({ advisor, scope, leads, advisors: canAny ? targets : [] });
}
