import { NextResponse } from "next/server";
import { eq, and, not } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/schema";
import { scoreMatchPredictions } from "@/lib/scoring";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Fetch missing results from ESPN's public scoreboard API and update our database.
 * Only accessible by admin users.
 * 
 * Usage: POST /api/fetch-results
 */

// Team name mapping: ESPN names → our DB names
const TEAM_NAME_MAP: Record<string, string> = {
  "Congo DR": "DR Congo",
  "Korea Republic": "South Korea",
  "Turkiye": "Turkey",
  "Türkiye": "Turkey",
  "Bosnia And Herzegovina": "Bosnia & Herzegovina",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Bosnia Herzegovina": "Bosnia & Herzegovina",
  "Cote D'Ivoire": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Czechia": "Czech Republic",
  "Korea, Republic Of": "South Korea",
  "Cabo Verde": "Cape Verde",
  "IR Iran": "Iran",
};

function mapTeamName(name: string): string {
  return TEAM_NAME_MAP[name] ?? name;
}

function calculatePoints(predHome: number, predAway: number, actualHome: number, actualAway: number): number {
  if (predHome === actualHome && predAway === actualAway) return 10;
  const predDiff = predHome - predAway;
  const actualDiff = actualHome - actualAway;
  if (Math.sign(predDiff) !== Math.sign(actualDiff)) return 0;
  if (predDiff === actualDiff) return 7;
  return 5;
}

export async function POST(request: Request) {
  // Admin check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  try {
    // Fetch World Cup scores from ESPN's public API
    // ESPN scoreboard endpoint for FIFA World Cup (league=fifa.world)
    const dates = getRecentDates(7); // last 7 days
    let allEvents: any[] = [];

    for (const date of dates) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.events) {
          allEvents = allEvents.concat(data.events);
        }
      }
    }

    let updated = 0;
    let scored = 0;
    const errors: string[] = [];

    for (const event of allEvents) {
      // Only process finished games
      if (event.status?.type?.state !== "post") continue;

      const competitors = event.competitions?.[0]?.competitors;
      if (!competitors || competitors.length !== 2) continue;

      const home = competitors.find((c: any) => c.homeAway === "home");
      const away = competitors.find((c: any) => c.homeAway === "away");
      if (!home || !away) continue;

      const homeTeam = mapTeamName(home.team.displayName || home.team.name);
      const awayTeam = mapTeamName(away.team.displayName || away.team.name);
      const homeScore = parseInt(home.score, 10);
      const awayScore = parseInt(away.score, 10);

      if (isNaN(homeScore) || isNaN(awayScore)) continue;

      // Find in our DB
      const dbMatches = await db
        .select()
        .from(matches)
        .where(and(eq(matches.homeTeam, homeTeam), eq(matches.awayTeam, awayTeam)))
        .limit(1);

      const dbMatch = dbMatches[0];
      if (!dbMatch) {
        // Try reversed (ESPN might have home/away swapped)
        const dbMatchesReversed = await db
          .select()
          .from(matches)
          .where(and(eq(matches.homeTeam, awayTeam), eq(matches.awayTeam, homeTeam)))
          .limit(1);

        if (dbMatchesReversed[0]) {
          // Found reversed - update with swapped scores
          const match = dbMatchesReversed[0];
          if (match.status === "finished" && match.homeScore === awayScore && match.awayScore === homeScore) continue;

          await db
            .update(matches)
            .set({ homeScore: awayScore, awayScore: homeScore, status: "finished", updatedAt: new Date() })
            .where(eq(matches.id, match.id));

          updated++;
          scored += await scorePredictions(match.id, awayScore, homeScore);
        } else {
          errors.push(`Not found: ${homeTeam} vs ${awayTeam}`);
        }
        continue;
      }

      // Skip if already finished with same score
      if (dbMatch.status === "finished" && dbMatch.homeScore === homeScore && dbMatch.awayScore === awayScore) continue;

      // Update match
      await db
        .update(matches)
        .set({ homeScore, awayScore, status: "finished", updatedAt: new Date() })
        .where(eq(matches.id, dbMatch.id));

      updated++;
      scored += await scorePredictions(dbMatch.id, homeScore, awayScore);
    }

    return NextResponse.json({
      success: true,
      updated,
      scored,
      eventsFound: allEvents.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function scorePredictions(matchId: string, homeScore: number, awayScore: number): Promise<number> {
  const matchPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.matchId, matchId));

  if (matchPredictions.length === 0) return 0;

  const scoredPredictions = scoreMatchPredictions(
    matchPredictions.map((p) => ({ id: p.id, homeScore: p.homeScore, awayScore: p.awayScore })),
    homeScore,
    awayScore
  );

  for (const sp of scoredPredictions) {
    await db
      .update(predictions)
      .set({ points: sp.points, updatedAt: new Date() })
      .where(eq(predictions.id, sp.id));
  }

  return scoredPredictions.length;
}

function getRecentDates(days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0].replace(/-/g, ""));
  }
  return dates;
}
