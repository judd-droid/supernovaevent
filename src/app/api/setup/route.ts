import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// The open events a device can choose from. Advisors sign in with their agent code
// (api/advisor), so the advisor list is never sent to devices.
export async function GET() {
  const errors: string[] = [];
  let events: { id: string; name: string; date: string | null; venue: string; survey: string }[] = [];
  try {
    const sql = await db();
    if (!sql) errors.push("The database isn't connected yet.");
    else events = (await sql`SELECT id, name, to_char(date, 'YYYY-MM-DD') AS date, venue, survey FROM events
                             WHERE active ORDER BY date DESC NULLS LAST, created_at DESC`) as typeof events;
  } catch (e) {
    console.error("[setup]", e);
    errors.push("Couldn't load the events. Try again in a moment.");
  }
  return Response.json({ events, errors });
}
