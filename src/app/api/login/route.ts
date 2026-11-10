import { NextResponse } from "next/server";
import { ADMIN_COOKIE, TEAM_COOKIE, sameString, token } from "@/lib/session";
import { clientIp, overLimit, tooMany } from "@/lib/ratelimit";

// The team passcode signs a device in for surveys; the AD's passcode also opens admin.
// At most 10 tries per device (IP) every 15 minutes, so passcodes can't be guessed.
export async function POST(req: Request) {
  if (await overLimit(`login:${clientIp(req)}`, 10, 15 * 60)) {
    return tooMany("Too many tries. Wait 15 minutes, then try again.");
  }
  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  const p = String(passcode ?? "").trim();
  const adminPass = process.env.ADMIN_PASSCODE;
  const teamPass = process.env.SURVEY_PASSCODE;
  if (!adminPass || !teamPass) return NextResponse.json({ error: "Passcodes aren't set up yet." }, { status: 503 });

  const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 };
  if (sameString(p, adminPass)) {
    const res = NextResponse.json({ ok: true, admin: true });
    res.cookies.set(ADMIN_COOKIE, (await token("admin"))!, opts);
    res.cookies.set(TEAM_COOKIE, (await token("team"))!, opts);
    return res;
  }
  if (sameString(p, teamPass)) {
    const res = NextResponse.json({ ok: true, admin: false });
    res.cookies.set(TEAM_COOKIE, (await token("team"))!, opts);
    return res;
  }
  return NextResponse.json({ error: "That passcode isn't right." }, { status: 401 });
}
