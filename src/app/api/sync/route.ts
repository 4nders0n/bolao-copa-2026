import { NextResponse } from "next/server";
import { syncMatches } from "@/lib/sync-matches";

/**
 * API route to sync World Cup fixtures from API-Football.
 * 
 * Can be triggered:
 * - Manually: GET /api/sync
 * - Via Vercel CRON: configure in vercel.json
 * - Via external CRON service (cron-job.org, etc.)
 * 
 * Protected by a simple secret token to prevent abuse.
 */
export async function GET(request: Request) {
  // Simple auth: check for secret token
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const expectedToken = process.env.SYNC_SECRET;

  if (expectedToken && token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMatches();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[SYNC ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
