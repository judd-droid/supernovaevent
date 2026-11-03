import { roster, type RosterAdvisor } from "@/lib/bigboard";
import { sameString } from "@/lib/session";

// The Loggers call these routes server to server with LEADS_API_KEY.
export function keyOk(req: Request): boolean {
  const key = process.env.LEADS_API_KEY;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return !!key && !!got && sameString(got, key);
}

// The advisors whose leads this person sees: their own, plus their unit's when
// they lead one (scope "unit").
export async function access(advisor: string, wantUnit: boolean) {
  const all: RosterAdvisor[] = await roster().catch(() => []);
  const me = all.find((a) => a.advisor.toLowerCase() === advisor.toLowerCase());
  const leader = !!(wantUnit && me?.isLeader && me.unit);
  const names = leader
    ? [advisor, ...all.filter((a) => a.unit === me!.unit && a.advisor.toLowerCase() !== advisor.toLowerCase()).map((a) => a.advisor)]
    : [advisor];
  return { all, leader, names: names.map((n) => n.toLowerCase()), scope: (leader ? "unit" : "self") as "unit" | "self" };
}

// Leaders may ask to move any lead they see; an event's team leader may ask to
// move the leads that came to them from the event's QR code.
export const mayRequest = (requester: string, leader: boolean, lead: { advisor: string; source?: string }) =>
  leader || (lead.advisor.toLowerCase() === requester.toLowerCase() && lead.source === "qr");
