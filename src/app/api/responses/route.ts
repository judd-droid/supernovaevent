import { db, notConfigured } from "@/lib/db";
import type { SurveyResponse } from "@/lib/survey";

// Devices send surveys here, one or a batch. Sending the same survey twice is
// harmless: the first copy wins. Devices can add surveys but never read them back.
export async function POST(req: Request) {
  const sql = await db();
  if (!sql) return notConfigured();
  const body = (await req.json().catch(() => null)) as { responses?: SurveyResponse[] } | null;
  const list = body?.responses ?? [];
  const saved: string[] = [];
  for (const r of list) {
    if (!r?.id || !r.eventId || !r.advisor || !r.answers) continue;
    const data = { eventName: r.eventName, answers: r.answers, contact: r.contact, consent: !!r.consent };
    await sql`INSERT INTO responses (id, event_id, advisor, data, created_at)
              VALUES (${r.id}, ${r.eventId}, ${r.advisor}, ${JSON.stringify(data)}::jsonb, ${r.createdAt})
              ON CONFLICT (id) DO NOTHING`;
    saved.push(r.id);
  }
  return Response.json({ saved });
}
