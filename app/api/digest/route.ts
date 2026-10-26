import { generateDailyDigest } from "@/lib/digest";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Writes the previous Malaysia day's digest. Called by Supabase Cron with the
 * same secret as ingestion; optionally accepts {"day":"YYYY-MM-DD"} to rebuild.
 */
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json(
      { error: "CRON_SECRET is not configured on the server." },
      { status: 500 },
    );
  }
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: "Supabase is not configured; nothing can be stored." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { day?: unknown };
  const day = typeof body.day === "string" ? body.day : undefined;

  try {
    const digest = await generateDailyDigest(day);
    return Response.json({
      day: digest.day,
      source: digest.source,
      model: digest.model,
      summary: digest.summary,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Digest generation failed",
      },
      { status: 500 },
    );
  }
}
