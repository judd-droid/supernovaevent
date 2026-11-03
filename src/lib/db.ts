// Neon Postgres, through Vercel's Neon integration. The devices save each survey
// first and send it here; this is the copy the team works from.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;
let ready: Promise<void> | null = null;

export async function db(): Promise<NeonQueryFunction<false, false> | null> {
  // DATABASE_URL by default; the Neon integration may name it with another prefix.
  const url = process.env.DATABASE_URL ?? process.env.STORAGE_URL ?? process.env.POSTGRES_URL;
  if (!url) return null;
  client ??= neon(url);
  const sql = client;
  ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS events (
      id text PRIMARY KEY,
      name text NOT NULL,
      date date,
      venue text NOT NULL DEFAULT '',
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    // One row per survey. `advisor` is the Roster name of the owner; `data`
    // holds the answers, contact details and consent as the device sent them.
    // Which survey variant the event uses (src/lib/surveys.ts).
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS survey text NOT NULL DEFAULT 'fws-2026-10'`;
    // Self-service: respondents scan the event's QR code (public_token) and answer on
    // their own phones. Those surveys belong to the event's team leader.
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS leader text`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS leader_mobile text NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS public_token text`;
    await sql`UPDATE events SET public_token = substr(md5(random()::text || id), 1, 16) WHERE public_token IS NULL`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS events_public_token ON events (public_token)`;
    await sql`CREATE TABLE IF NOT EXISTS responses (
      id text PRIMARY KEY,
      event_id text NOT NULL,
      advisor text NOT NULL,
      data jsonb NOT NULL,
      created_at timestamptz NOT NULL,
      received_at timestamptz NOT NULL DEFAULT now(),
      reassigned_from text
    )`;
    await sql`CREATE INDEX IF NOT EXISTS responses_advisor ON responses (advisor)`;
    await sql`CREATE INDEX IF NOT EXISTS responses_event ON responses (event_id)`;
  })().catch((e) => { ready = null; throw e; });
  await ready;
  return sql;
}

export const notConfigured = () =>
  Response.json({ error: "The database isn't connected yet (DATABASE_URL)." }, { status: 503 });
