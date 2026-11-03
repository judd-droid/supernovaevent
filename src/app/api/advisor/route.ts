import { roster } from "@/lib/bigboard";

export const dynamic = "force-dynamic";

// An advisor signs a device in with their agent code; this returns only their own
// Roster name, so devices never see the advisor list.
export async function GET(req: Request) {
  const norm = (v: string) => v.replace(/\D/g, "").replace(/^0+/, "");
  const code = norm(new URL(req.url).searchParams.get("code") ?? "");
  if (!code) return Response.json({ error: "Enter your agent code." }, { status: 400 });
  try {
    const match = (await roster()).find((a) => norm(a.code ?? "") === code);
    if (!match) return Response.json({ error: "That agent code isn't on the Supernova roster. Check it and try again." }, { status: 404 });
    return Response.json({ advisor: match.advisor });
  } catch {
    return Response.json({ error: "Couldn't check the agent code right now. Try again." }, { status: 502 });
  }
}
