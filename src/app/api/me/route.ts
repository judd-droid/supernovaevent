import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

// Whether this device is signed in with the AD's passcode, so the survey screen
// can show a link to admin.
export async function GET() {
  const jar = await cookies();
  return Response.json({ admin: await hasCookie("admin", jar.get(ADMIN_COOKIE)?.value) });
}
