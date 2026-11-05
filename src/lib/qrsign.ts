// An advisor's own QR code carries their name (and mobile, for the respondent's
// Snapshot) with a signature, so a respondent can't edit the link to hand the
// lead to someone else.

function secret(): string {
  return process.env.QR_SECRET || process.env.LEADS_API_KEY || process.env.ADMIN_PASSCODE || "";
}

export async function qrSig(eventToken: string, advisor: string, mobile: string): Promise<string> {
  const s = secret();
  if (!s) return "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(`supernovaevent:qr:${s}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${eventToken}|${advisor}|${mobile}`)));
  return btoa(String.fromCharCode(...mac.slice(0, 12))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// The advisor a signed link names, or null when there's no (valid) signature.
export async function qrAdvisor(eventToken: string, a?: string | null, m?: string | null, s?: string | null) {
  if (!a || !s) return null;
  const expected = await qrSig(eventToken, a, m ?? "");
  if (!expected || expected.length !== s.length) return null;
  let diff = 0;
  for (let i = 0; i < s.length; i++) diff |= s.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? { advisor: a, mobile: m ?? "" } : null;
}
