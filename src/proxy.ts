import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, TEAM_COOKIE, hasCookie } from "@/lib/session";

// Open: sign-in, the privacy notice, a respondent's own result page, last year's
// Medicard app, the Logger's leads feed (it checks its own key), and the
// self-service survey that respondents open from an event's QR code.
const OPEN = ["/login", "/api/login", "/privacy", "/r", "/api/leads"];

// The admin page and its API need the AD's passcode. Everything else needs the
// team passcode (the AD's works too). Without passcodes set, it stays locked.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (OPEN.includes(pathname) || pathname.startsWith("/medicard") || pathname.startsWith("/e/") || pathname.startsWith("/api/public/")) {
    return NextResponse.next();
  }

  const admin = await hasCookie("admin", req.cookies.get(ADMIN_COOKIE)?.value);
  const needsAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const ok = admin || (!needsAdmin && (await hasCookie("team", req.cookies.get(TEAM_COOKIE)?.value)));
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = needsAdmin ? "?admin=1" : pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|supernova).*)"],
};
