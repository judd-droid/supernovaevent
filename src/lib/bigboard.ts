// Server-only access to Big Board for the roster. The token never reaches the browser.

export type RosterAdvisor = { advisor: string; unit?: string; isLeader?: boolean; code?: string; division?: string };

// Which Logger an advisor uses: Spartans use the Appointment 15 Logger; Legacy
// and Wolfpack share the Appointment 5 Logger. Leads only move within one Logger.
// "Spartan Guest" (working with the team before a transfer is official) counts as a Spartan here.
export const loggerOf = (a?: RosterAdvisor) => (/^spartan\b/i.test(a?.division ?? "") ? "appt15" : "appt5");

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
  return (d.advisors ?? []).map(({ advisor, unit, isLeader, code, division }) => ({ advisor, unit, isLeader, code, division }));
}
