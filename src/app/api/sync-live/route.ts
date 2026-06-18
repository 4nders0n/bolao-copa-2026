import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/schema";
import { scoreMatchPredictions } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const API_BASE = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;

/**
 * Sync live World Cup fixtures from API-Football.
 * 
 * This endpoint uses /fixtures?league=1&live=all which works on the free plan.
 * Call it periodically during matches to get live scores.
 * 
 * Also checks recently finished matches using /fixtures?league=1&last=5
 * 
 * Usage: GET /api/sync-live?token=your-sync-secret
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

    // Fetch live World Cup matches
    const liveRes = await fetch(`${API_BASE}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&live=all`, {
      headers: { "x-apisports-key": apiKey },
    });
    const liveData = await liveRes.json();

    // Fetch today's fixtures (catches recently finished games)
    const today = new Date().toISOString().split("T")[0]; // "2026-06-17"
    const todayRes = await fetch(`${API_BASE}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&date=${today}`, {
      headers: { "x-apisports-key": apiKey },
    });
    const todayData = await todayRes.json();

    // Combine both results, deduplicate by fixture id
    const allFixtures = [...(liveData.response || []), ...(todayData.response || [])];
    const seen = new Set<number>();
    const uniqueFixtures = allFixtures.filter((f: any) => {
      if (seen.has(f.fixture.id)) return false;
      seen.add(f.fixture.id);
      return true;
    });

    // Team name mapping: API-Football names → our DB names
    const TEAM_NAME_MAP: Record<string, string> = {
      "Congo DR": "DR Congo",
      "Korea Republic": "South Korea",
      "Turkiye": "Turkey",
      "Türkiye": "Turkey",
      "Bosnia And Herzegovina": "Bosnia & Herzegovina",
      "Cote D'Ivoire": "Ivory Coast",
      "Ivory Coast": "Ivory Coast",
      "Curacao": "Curacao",
      "Cape Verde": "Cape Verde",
      "New Zealand": "New Zealand",
      "Saudi Arabia": "Saudi Arabia",
      "Czech Republic": "Czech Republic",
      "Czechia": "Czech Republic",
      "South Africa": "South Africa",
    };

    for (const fixture of uniqueFixtures) {
      const rawHome = fixture.teams.home.name;
      const rawAway = fixture.teams.away.name;
      const homeTeam = TEAM_NAME_MAP[rawHome] ?? rawHome;
      const awayTeam = TEAM_NAME_MAP[rawAway] ?? rawAway;
      const homeScore = fixture.goals.home;
      const awayScore = fixture.goals.away;
      const apiStatus = fixture.fixture.status.short;

      // Map API status
      const finishedStatuses = ["FT", "AET", "PEN"];
      const liveStatuses = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"];
      let status: "scheduled" | "live" | "finished" = "scheduled";
      if (finishedStatuses.includes(apiStatus)) status = "finished";
      else if (liveStatuses.includes(apiStatus)) status = "live";

      // Find matching match in our DB by team names
      const dbMatches = await db
        .select()
        .from(matches)
        .where(and(eq(matches.homeTeam, homeTeam), eq(matches.awayTeam, awayTeam)))
        .limit(1);

      const dbMatch = dbMatches[0];
      if (!dbMatch) continue;

      // Check if update needed
      const needsUpdate =
        dbMatch.status !== status ||
        dbMatch.homeScore !== homeScore ||
        dbMatch.awayScore !== awayScore;

      if (!needsUpdate) continue;

      const wasNotFinished = dbMatch.status !== "finished";
      const isNowFinished = status === "finished";

      // Update match
      await db
        .update(matches)
        .set({
          homeScore,
          awayScore,
          status,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, dbMatch.id));

      updated++;

      // If just finished, score predictions
      if (wasNotFinished && isNowFinished && homeScore !== null && awayScore !== null) {
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
            homeScore,
            awayScore
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
      scored,
      liveMatches: liveData.results || 0,
      todayMatches: todayData.results || 0,
      todayErrors: todayData.errors || null,
      timestamp: new Date().toISOString(),
      apiFixtures: uniqueFixtures.map((f: any) => ({
        home: f.teams.home.name,
        away: f.teams.away.name,
        score: `${f.goals.home}-${f.goals.away}`,
        status: f.fixture.status.short,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
