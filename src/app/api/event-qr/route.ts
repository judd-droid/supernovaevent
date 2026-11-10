import { db, notConfigured } from "@/lib/db";
import { ADMIN_COOKIE, hasCookie } from "@/lib/session";
import { deviceHasAdvisor } from "@/lib/advisor-cookie";

export const dynamic = "force-dynamic";

// The event's own (booth) QR code; its scans go to the team leader. Only the AD
// and the event's team leader (the advisor signed in on this device) can open it;
// every other advisor uses their own QR code.
export async function GET(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const p = new URL(req.url).searchParams;
  const id = p.get("id") ?? "";
  const rows = await sql`SELECT name, public_token, leader, active FROM events WHERE id = ${id}`;
  const e = rows[0];
  if (!e) return Response.json({ error: "Event not found." }, { status: 404 });
  const cookie = req.headers.get("cookie") ?? "";
  const adminValue = cookie.split(/;\s*/).find((c) => c.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  const admin = await hasCookie("admin", adminValue ? decodeURIComponent(adminValue) : undefined);
  const advisor = (p.get("advisor") ?? "").trim().toLowerCase();
  // The leader must also be proved on this device (agent code), not just named.
  const isLeader = !!e.leader && advisor === String(e.leader).toLowerCase() && (await deviceHasAdvisor(req, String(e.leader)));
  if (!admin && !isLeader) {
    return Response.json({ error: "Only the event's team leader can open the booth QR code, after confirming their agent code on this device (Switch advisor). Everyone else uses their own QR code from the top bar." }, { status: 403 });
  }
  return Response.json({ name: e.name, token: e.public_token, leader: e.leader, active: e.active });
}
