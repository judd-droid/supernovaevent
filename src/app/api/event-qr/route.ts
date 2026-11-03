import { db, notConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

// The event's self-service link, for its QR code. Behind the team passcode.
export async function GET(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const rows = await sql`SELECT name, public_token, leader, active FROM events WHERE id = ${id}`;
  const e = rows[0];
  if (!e) return Response.json({ error: "Event not found." }, { status: 404 });
  return Response.json({ name: e.name, token: e.public_token, leader: e.leader, active: e.active });
}
