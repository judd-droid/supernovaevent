import { roster } from "@/lib/bigboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ advisors: (await roster()).map((a) => a.advisor) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
