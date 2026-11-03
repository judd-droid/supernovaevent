// Two passcodes. SURVEY_PASSCODE is the team's, entered once per device.
// ADMIN_PASSCODE is the AD's and opens the admin page. Cookies hold a SHA-256 of
// the passcode (never the passcode), so changing one signs those devices out.

export const TEAM_COOKIE = "sv_team";
export const ADMIN_COOKIE = "sv_admin";

async function sha(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function token(kind: "team" | "admin"): Promise<string | null> {
  const pass = kind === "team" ? process.env.SURVEY_PASSCODE : process.env.ADMIN_PASSCODE;
  return pass ? sha(`supernovaevent:${kind}:${pass}`) : null;
}

export function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hasCookie(kind: "team" | "admin", value: string | undefined): Promise<boolean> {
  const expected = await token(kind);
  return !!expected && !!value && sameString(value, expected);
}
