import { db } from "@/lib/db";
import { roster } from "@/lib/bigboard";

export const dynamic = "force-dynamic";

// What a device needs before its first survey: the open events and the advisor names.
export async function GET() {
  const errors: string[] = [];
  let events: { id: string; name: string; date: string | null; venue: string; survey: string }[] = [];
  try {
    const sql = await db();
    if (!sql) errors.push("The database isn't connected yet.");
    else events = (await sql`SELECT id, name, to_char(date, 'YYYY-MM-DD') AS date, venue, survey FROM events
                             WHERE active ORDER BY date DESC NULLS LAST, created_at DESC`) as typeof events;
  } catch (e) {
    errors.push(`Events: ${e instanceof Error ? e.message : e}`);
  }
  let advisors: string[] = [];
  try {
    advisors = (await roster()).map((a) => a.advisor);
  } catch (e) {
    errors.push(`Advisors: ${e instanceof Error ? e.message : e}`);
  }
  return Response.json({ events, advisors, errors });
}
