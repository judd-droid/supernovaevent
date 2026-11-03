// Neon Postgres, through Vercel's Neon integration. The devices save each survey
// first and send it here; this is the copy the team works from.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;
let ready: Promise<void> | null = null;

export async function db(): Promise<NeonQueryFunction<false, false> | null> {
  const url = process.env.DATABASE_URL;
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
