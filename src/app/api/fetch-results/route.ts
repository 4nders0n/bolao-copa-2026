import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/schema";
import { scoreMatchPredictions } from "@/lib/scoring";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomId } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Team name mapping: ESPN names → our DB names
const TEAM_NAME_MAP: Record<string, string> = {
  "Congo DR": "DR Congo",
  "DR Congo": "DR Congo",
  "Korea Republic": "South Korea",
  "Turkiye": "Turkey",
  "Türkiye": "Turkey",
  "Bosnia And Herzegovina": "Bosnia & Herzegovina",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Bosnia Herzegovina": "Bosnia & Herzegovina",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Cote D'Ivoire": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Czechia": "Czech Republic",
  "Korea, Republic Of": "South Korea",
  "Cabo Verde": "Cape Verde",
  "IR Iran": "Iran",
  "Curaçao": "Curacao",
};

function mapTeamName(name: string): string {
  return TEAM_NAME_MAP[name] ?? name;
}

// Map ESPN round names to our phase names
function mapPhase(espnRound: string): string {
  if (!espnRound) return "group_stage";
  const lower = espnRound.toLowerCase();
  if (lower.includes("group")) return "group_stage";
  if (lower.includes("round of 32") || lower.includes("last 32")) return "round_of_32";
  if (lower.includes("round of 16") || lower.includes("last 16")) return "round_of_16";
  if (lower.includes("quarter")) return "quarter_finals";
  if (lower.includes("semi")) return "semi_finals";
  if (lower.includes("third") || lower.includes("3rd")) return "third_place";
  if (lower.includes("final") && !lower.includes("semi") && !lower.includes("quarter")) return "final";
  return "round_of_32";
}

/**
 * Fetch World Cup fixtures from ESPN's public API.
 * - Creates new matches that don't exist in our DB
 * - Updates results for finished matches
 * - Scores predictions automatically
 * 
 * Only accessible by admin users.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  try {
    // Fetch from ESPN - last 14 days + next 7 days
    const dates = getDates(-14, 7);
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

    // Deduplicate by event ID
    const seen = new Set<string>();
    allEvents = allEvents.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    let inserted = 0;
    let updated = 0;
    let scored = 0;
    const errors: string[] = [];
    const defaultBroadcast = JSON.stringify(["CazéTV", "Globo", "SBT", "SporTV"]);

    for (const event of allEvents) {
      const competitors = event.competitions?.[0]?.competitors;
      if (!competitors || competitors.length !== 2) continue;

      const home = competitors.find((c: any) => c.homeAway === "home");
      const away = competitors.find((c: any) => c.homeAway === "away");
      if (!home || !away) continue;

      const homeTeam = mapTeamName(home.team.displayName || home.team.name);
      const awayTeam = mapTeamName(away.team.displayName || away.team.name);
      const matchDate = new Date(event.date);
      const isFinished = event.status?.type?.state === "post";
      const isLive = event.status?.type?.state === "in";
      const homeScore = parseInt(home.score, 10);
      const awayScore = parseInt(away.score, 10);
      const round = event.competitions?.[0]?.round?.displayName || event.season?.slug || "";
      const phase = mapPhase(round);

      // Try to find match in DB
      let dbMatch = await findMatch(homeTeam, awayTeam);

      if (!dbMatch) {
        // Try reversed
        dbMatch = await findMatch(awayTeam, homeTeam);
        if (dbMatch) {
          // Found reversed - skip this one, ESPN has it flipped
          // Update with swapped scores if finished
          if (isFinished && !isNaN(homeScore) && !isNaN(awayScore)) {
            if (dbMatch.status !== "finished" || dbMatch.homeScore !== awayScore || dbMatch.awayScore !== homeScore) {
              await db.update(matches).set({
                homeScore: awayScore, awayScore: homeScore, status: "finished", updatedAt: new Date()
              }).where(eq(matches.id, dbMatch.id));
              updated++;
              scored += await scorePredictions(dbMatch.id, awayScore, homeScore);
            }
          }
          continue;
        }

        // Match doesn't exist - insert it
        const newId = randomId();
        await db.insert(matches).values({
          id: newId,
          homeTeam,
          awayTeam,
          matchDate,
          phase,
          group: null,
          homeScore: isFinished && !isNaN(homeScore) ? homeScore : null,
          awayScore: isFinished && !isNaN(awayScore) ? awayScore : null,
          status: isFinished ? "finished" : isLive ? "live" : "scheduled",
          broadcast: defaultBroadcast,
        });
        inserted++;

        // Score if already finished
        if (isFinished && !isNaN(homeScore) && !isNaN(awayScore)) {
          scored += await scorePredictions(newId, homeScore, awayScore);
        }
        continue;
      }

      // Match exists - update if needed
      if (isFinished && !isNaN(homeScore) && !isNaN(awayScore)) {
        if (dbMatch.status !== "finished" || dbMatch.homeScore !== homeScore || dbMatch.awayScore !== awayScore) {
          await db.update(matches).set({
            homeScore, awayScore, status: "finished", updatedAt: new Date()
          }).where(eq(matches.id, dbMatch.id));
          updated++;
          scored += await scorePredictions(dbMatch.id, homeScore, awayScore);
        }
      } else if (isLive && !isNaN(homeScore) && !isNaN(awayScore)) {
        if (dbMatch.homeScore !== homeScore || dbMatch.awayScore !== awayScore || dbMatch.status !== "live") {
          await db.update(matches).set({
            homeScore, awayScore, status: "live", updatedAt: new Date()
          }).where(eq(matches.id, dbMatch.id));
          updated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
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

async function findMatch(homeTeam: string, awayTeam: string) {
  const results = await db
    .select()
    .from(matches)
    .where(and(eq(matches.homeTeam, homeTeam), eq(matches.awayTeam, awayTeam)))
    .limit(1);
  return results[0] ?? null;
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

function getDates(daysBack: number, daysForward: number): string[] {
  const dates: string[] = [];
  for (let i = daysBack; i <= daysForward; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0].replace(/-/g, ""));
  }
  return dates;
}
