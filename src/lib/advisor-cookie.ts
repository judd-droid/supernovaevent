// Which advisors this device has proved with an agent code. /api/advisor adds the
// advisor to a signed cookie when the code checks out; QR codes and survey links
// can only be made for advisors in it, so a team member can't make one in someone
// else's name. Signed with QR_SECRET (HMAC-SHA256); httpOnly, so pages can't edit it.

export const ADVISOR_COOKIE = "sv_advisors";
const MAX_ADVISORS = 10;

async function mac(text: string): Promise<string> {
  const s = process.env.QR_SECRET ?? "";
  if (!s) return "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(`supernovaevent:advisors:${s}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

/** The advisors a cookie value vouches for (empty when missing or tampered with). */
export async function advisorsFrom(value: string | undefined): Promise<string[]> {
  if (!value) return [];
  const [body, sig] = value.split(".");
  if (!body || !sig) return [];
  const expected = await mac(body);
  if (!expected || expected.length !== sig.length) return [];
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return [];
  try {
    const list = JSON.parse(unb64(body));
    return Array.isArray(list) ? list.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

/** A new cookie value with `advisor` added (most recent first). */
export async function withAdvisor(value: string | undefined, advisor: string): Promise<string | null> {
  const list = [advisor, ...(await advisorsFrom(value)).filter((n) => n.toLowerCase() !== advisor.toLowerCase())].slice(0, MAX_ADVISORS);
  const body = b64(JSON.stringify(list));
  const sig = await mac(body);
  return sig ? `${body}.${sig}` : null;
}

export const cookieValue = (req: Request, name: string): string | undefined => {
  const c = (req.headers.get("cookie") ?? "").split(/;\s*/).find((x) => x.startsWith(`${name}=`));
  return c ? decodeURIComponent(c.slice(name.length + 1)) : undefined;
};

/** Whether this request's device has proved `advisor` with their agent code. */
export async function deviceHasAdvisor(req: Request, advisor: string): Promise<boolean> {
  const list = await advisorsFrom(cookieValue(req, ADVISOR_COOKIE));
  return list.some((n) => n.toLowerCase() === advisor.toLowerCase());
}

export const ADVISOR_COOKIE_OPTS = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 };
