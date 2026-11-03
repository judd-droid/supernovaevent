import { db, notConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

// What a respondent's phone needs to show an event's survey from its QR code.
// Only open events with a team leader take self-service surveys.
export async function GET(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const t = new URL(req.url).searchParams.get("t") ?? "";
  const rows = await sql`SELECT name, survey, leader, leader_mobile, active FROM events WHERE public_token = ${t}`;
  const e = rows[0];
  if (!e) return Response.json({ error: "This survey link isn't valid." }, { status: 404 });
  if (!e.active || !e.leader) return Response.json({ error: "This survey isn't open right now." }, { status: 410 });
  return Response.json({ name: e.name, survey: e.survey, leader: e.leader, leaderMobile: e.leader_mobile });
}
