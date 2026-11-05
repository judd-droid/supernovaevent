import { db, notConfigured } from "@/lib/db";
import { qrSig } from "@/lib/qrsign";

export const dynamic = "force-dynamic";

// The signed-in advisor's own QR link for an event: scans of it are their leads.
// Behind the team passcode. Shown on screen only (no print or download).
export async function GET(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const p = new URL(req.url).searchParams;
  const id = p.get("id") ?? "";
  const advisor = (p.get("advisor") ?? "").trim();
  const mobile = (p.get("mobile") ?? "").trim();
  if (!advisor) return Response.json({ error: "Sign in as an advisor first." }, { status: 400 });
  const rows = await sql`SELECT name, public_token, active, leader FROM events WHERE id = ${id}`;
  const e = rows[0];
  if (!e) return Response.json({ error: "Event not found." }, { status: 404 });
  const s = await qrSig(e.public_token, advisor, mobile);
  if (!s) return Response.json({ error: "Personal QR codes aren't set up yet." }, { status: 503 });
  const q = new URLSearchParams({ a: advisor, ...(mobile ? { m: mobile } : {}), s });
  return Response.json({
    name: e.name, active: e.active, path: `/e/${e.public_token}?${q}`,
    isLeader: !!e.leader && String(e.leader).toLowerCase() === advisor.toLowerCase(),
  });
}
