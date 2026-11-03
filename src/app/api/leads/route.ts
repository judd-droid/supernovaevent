import { db, notConfigured } from "@/lib/db";
import { roster } from "@/lib/bigboard";
import { sameString } from "@/lib/session";

export const dynamic = "force-dynamic";

// For the Loggers' Leads page, server to server: the Logger checks the advisor's
// Name and Sync Key, then asks here with LEADS_API_KEY for that advisor's leads.
// ?advisor=<Roster name> returns their own; add &scope=unit and a leader gets
// every lead taken by advisors in their unit.
export async function GET(req: Request) {
  const key = process.env.LEADS_API_KEY;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!key || !got || !sameString(got, key)) return Response.json({ error: "Not allowed" }, { status: 401 });

  const sql = await db();
  if (!sql) return notConfigured();
  const params = new URL(req.url).searchParams;
  const advisor = (params.get("advisor") ?? "").trim();
  if (!advisor) return Response.json({ error: "Missing advisor" }, { status: 400 });

  let names = [advisor];
  let scope: "self" | "unit" = "self";
  if (params.get("scope") === "unit") {
    const all = await roster().catch(() => []);
    const me = all.find((a) => a.advisor.toLowerCase() === advisor.toLowerCase());
    if (me?.isLeader && me.unit) {
      names = [advisor, ...all.filter((a) => a.unit === me.unit && a.advisor.toLowerCase() !== advisor.toLowerCase()).map((a) => a.advisor)];
      scope = "unit";
    }
  }
  const lower = names.map((n) => n.toLowerCase());
  const leads = await sql`SELECT r.id, r.advisor, r.data, r.created_at, e.name AS event_name, to_char(e.date, 'YYYY-MM-DD') AS event_date
                          FROM responses r LEFT JOIN events e ON e.id = r.event_id
                          WHERE lower(r.advisor) = ANY(${lower}) ORDER BY r.created_at DESC`;
  return Response.json({ advisor, scope, leads });
}
