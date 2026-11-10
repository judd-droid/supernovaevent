// Simple fixed-window rate limits kept in Postgres, so they hold across serverless
// instances. Used to slow down passcode guessing, agent-code lookups and floods of
// public survey submissions.

import { db } from "@/lib/db";

let ready: Promise<void> | null = null;

// The caller's IP as Vercel reports it (first x-forwarded-for entry).
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return (fwd.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/** Counts one hit for `key` and says whether it is over `max` within `windowSec`.
 *  Fails open (allows) when the database is unreachable, so an outage never locks
 *  the team out. */
export async function overLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const sql = await db();
  if (!sql) return false;
  try {
    ready ??= (async () => {
      await sql`CREATE TABLE IF NOT EXISTS rate_limits (
        key text PRIMARY KEY,
        window_start timestamptz NOT NULL,
        count int NOT NULL
      )`;
    })().catch((e) => { ready = null; throw e; });
    await ready;
    const rows = await sql`
      INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN now() ELSE rate_limits.window_start END
      RETURNING count`;
    // Occasionally clear windows that ended a day ago.
    if (Math.random() < 0.01) await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
    return Number(rows[0]?.count ?? 0) > max;
  } catch (e) {
    console.error("[ratelimit]", e);
    return false;
  }
}

export const tooMany = (message: string) => Response.json({ error: message }, { status: 429 });
