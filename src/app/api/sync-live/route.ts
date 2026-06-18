import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/schema";
import { scoreMatchPredictions } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const API_BASE = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;

// Team name mapping: API-Football names → our DB names
const TEAM_NAME_MAP: Record<string, string> = {
  "Congo DR": "DR Congo",
  "Korea Republic": "South Korea",
  "Turkiye": "Turkey",
  "Türkiye": "Turkey",
  "Bosnia And Herzegovina": "Bosnia & Herzegovina",
  "Cote D'Ivoire": "Ivory Coast",
  "Curacao": "Curacao",
  "Czechia": "Czech Republic",
};

function mapTeamName(apiName: string): string {
  return TEAM_NAME_MAP[apiName] ?? apiName;
}

/**
 * Sync live World Cup fixtures from API-Football.
 *
 * Strategy:
 * 1. Fetch live matches → update scores in DB as "live"
 * 2. Check DB for matches that were "live" but are NOT in the live feed anymore
 *    → they just finished. Mark as "finished" and score predictions.
 *
 * This avoids needing the ?date= or ?last= endpoints (blocked on free plan).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const expectedToken = process.env.SYNC_SECRET;

  if (expectedToken && token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY not configured" }, { status: 500 });
  }

  try {
    let updated = 0;
    let scored = 0;
    let finalized = 0;

    // Step 1: Fetch live World Cup matches
    const liveRes = await fetch(`${API_BASE}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&live=all`, {
      headers: { "x-apisports-key": apiKey },
    });
    const liveData = await liveRes.json();
    const liveFixtures = liveData.response || [];

    // Track which matches from our DB are currently live in the API
    const liveMatchIds = new Set<string>();

    // Update live matches in DB
    for (const fixture of liveFixtures) {
      const homeTeam = mapTeamName(fixture.teams.home.name);
      const awayTeam = mapTeamName(fixture.teams.away.name);
      const homeScore = fixture.goals.home;
      const awayScore = fixture.goals.away;

      // Find in DB
      const dbMatches = await db
        .select()
        .from(matches)
        .where(and(eq(matches.homeTeam, homeTeam), eq(matches.awayTeam, awayTeam)))
        .limit(1);

      const dbMatch = dbMatches[0];
      if (!dbMatch) continue;

      liveMatchIds.add(dbMatch.id);

      // Update score and status to "live"
      const needsUpdate =
        dbMatch.status !== "live" ||
        dbMatch.homeScore !== homeScore ||
        dbMatch.awayScore !== awayScore;

      if (needsUpdate) {
        await db
          .update(matches)
          .set({
            homeScore,
            awayScore,
            status: "live",
            updatedAt: new Date(),
          })
          .where(eq(matches.id, dbMatch.id));
        updated++;
      }
    }

    // Step 2: Find matches in DB that are "live" but NOT in the API live feed
    // → these just finished
    const dbLiveMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.status, "live"));

    for (const dbMatch of dbLiveMatches) {
      if (liveMatchIds.has(dbMatch.id)) continue; // still live, skip

      // This match was "live" in our DB but is no longer in the API feed → it finished
      // Use the last known score (already saved from previous sync calls)
      if (dbMatch.homeScore !== null && dbMatch.awayScore !== null) {
        // Mark as finished
        await db
          .update(matches)
          .set({ status: "finished", updatedAt: new Date() })
          .where(eq(matches.id, dbMatch.id));

        finalized++;

        // Score predictions
        const matchPredictions = await db
          .select()
          .from(predictions)
          .where(eq(predictions.matchId, dbMatch.id));

        if (matchPredictions.length > 0) {
          const scoredPredictions = scoreMatchPredictions(
            matchPredictions.map((p) => ({
              id: p.id,
              homeScore: p.homeScore,
              awayScore: p.awayScore,
            })),
            dbMatch.homeScore,
            dbMatch.awayScore
          );

          for (const sp of scoredPredictions) {
            await db
              .update(predictions)
              .set({ points: sp.points, updatedAt: new Date() })
              .where(eq(predictions.id, sp.id));
          }

          scored += matchPredictions.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      finalized,
      scored,
      liveMatches: liveFixtures.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
