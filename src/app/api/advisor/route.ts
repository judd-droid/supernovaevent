import { NextResponse } from "next/server";
import { roster } from "@/lib/bigboard";
import { ADVISOR_COOKIE, ADVISOR_COOKIE_OPTS, cookieValue, withAdvisor } from "@/lib/advisor-cookie";
import { clientIp, overLimit, tooMany } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// An advisor signs a device in with their agent code; this returns only their own
// Roster name, so devices never see the advisor list. A match is remembered for this
// device (signed cookie), which lets it open that advisor's QR code and link.
// At most 30 lookups per device every 15 minutes, so codes can't be stepped through.
export async function GET(req: Request) {
  if (await overLimit(`advisor:${clientIp(req)}`, 30, 15 * 60)) {
    return tooMany("Too many agent codes tried. Wait 15 minutes, then try again.");
  }
  const norm = (v: string) => v.replace(/\D/g, "").replace(/^0+/, "");
  const code = norm(new URL(req.url).searchParams.get("code") ?? "");
  if (!code) return Response.json({ error: "Enter your agent code." }, { status: 400 });
  try {
    const match = (await roster()).find((a) => norm(a.code ?? "") === code);
    if (!match) return Response.json({ error: "That agent code isn't on the Supernova roster. Check it and try again." }, { status: 404 });
    const res = NextResponse.json({ advisor: match.advisor });
    const v = await withAdvisor(cookieValue(req, ADVISOR_COOKIE), match.advisor);
    if (v) res.cookies.set(ADVISOR_COOKIE, v, ADVISOR_COOKIE_OPTS);
    return res;
  } catch {
    return Response.json({ error: "Couldn't check the agent code right now. Try again." }, { status: 502 });
  }
}
