import { db, notConfigured } from "@/lib/db";
import { qrAdvisor } from "@/lib/qrsign";

export const dynamic = "force-dynamic";

// What a respondent's phone needs to show an event's survey from a QR code.
// The event's own code belongs to its team leader (so it needs one); an
// advisor's own code (signed a/m/s) belongs to that advisor.
export async function GET(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const p = new URL(req.url).searchParams;
  const t = p.get("t") ?? "";
  const rows = await sql`SELECT name, survey, leader, leader_mobile, active FROM events WHERE public_token = ${t}`;
  const e = rows[0];
  if (!e) return Response.json({ error: "This survey link isn't valid." }, { status: 404 });
  const own = await qrAdvisor(t, p.get("a"), p.get("m"), p.get("s"));
  if (!e.active || (!own && !e.leader)) return Response.json({ error: "This survey isn't open right now." }, { status: 410 });
  return Response.json({
    name: e.name, survey: e.survey,
    leader: own ? own.advisor : e.leader, leaderMobile: own ? own.mobile : e.leader_mobile,
  });
}
