// Server-only access to Big Board for the roster. The token never reaches the browser.

export type RosterAdvisor = { advisor: string; unit?: string; isLeader?: boolean; code?: string };

export async function roster(): Promise<RosterAdvisor[]> {
  const base = process.env.BIGBOARD_URL;
  const tok = process.env.BIGBOARD_TOKEN;
  if (!base || !tok) throw new Error("Big Board is not configured (BIGBOARD_URL, BIGBOARD_TOKEN).");
  const res = await fetch(base.replace(/\/$/, "") + "/api/roster", {
    headers: { authorization: `Bearer ${tok}` },
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`Big Board roster: ${res.status}`);
  const d = (await res.json()) as { advisors?: RosterAdvisor[] };
  return (d.advisors ?? []).map(({ advisor, unit, isLeader, code }) => ({ advisor, unit, isLeader, code }));
}
