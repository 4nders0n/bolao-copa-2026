import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { matches, predictions } from "./schema";
import { fetchWorldCupFixtures, type WorldCupFixture } from "./api-football";
import { scoreMatchPredictions } from "./scoring";
import { randomId } from "./utils";

/**
 * Sync all World Cup fixtures from API-Football into the database.
 * - Inserts new matches that don't exist yet
 * - Updates existing matches (status, scores)
 * - Triggers scoring for matches that just finished
 */
export async function syncMatches(): Promise<{
  inserted: number;
  updated: number;
  scored: number;
}> {
  const fixtures = await fetchWorldCupFixtures();
  let inserted = 0;
  let updated = 0;
  let scored = 0;

  for (const fixture of fixtures) {
    // Try to find existing match by homeTeam + awayTeam + matchDate
    const existing = await db.query.matches.findFirst({
      where: and(
        eq(matches.homeTeam, fixture.homeTeam),
        eq(matches.awayTeam, fixture.awayTeam),
        eq(matches.matchDate, fixture.matchDate)
      ),
    });

    if (!existing) {
      // Insert new match
      await db.insert(matches).values({
        id: randomId(),
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        matchDate: fixture.matchDate,
        phase: fixture.phase,
        group: fixture.group,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
        status: fixture.status,
      });
      inserted++;
    } else {
      // Check if match needs update
      const needsUpdate =
        existing.status !== fixture.status ||
        existing.homeScore !== fixture.homeScore ||
        existing.awayScore !== fixture.awayScore;

      if (needsUpdate) {
        const wasNotFinished = existing.status !== "finished";
        const isNowFinished = fixture.status === "finished";

        await db
          .update(matches)
          .set({
            homeScore: fixture.homeScore,
            awayScore: fixture.awayScore,
            status: fixture.status,
            updatedAt: new Date(),
          })
          .where(eq(matches.id, existing.id));

        updated++;

        // If match just finished, calculate scores
        if (wasNotFinished && isNowFinished && fixture.homeScore !== null && fixture.awayScore !== null) {
          const matchPredictions = await db.query.predictions.findMany({
            where: eq(predictions.matchId, existing.id),
          });

          if (matchPredictions.length > 0) {
            const scored_predictions = scoreMatchPredictions(
              matchPredictions.map((p) => ({
                id: p.id,
                homeScore: p.homeScore,
                awayScore: p.awayScore,
              })),
              fixture.homeScore,
              fixture.awayScore
            );

            for (const sp of scored_predictions) {
              await db
                .update(predictions)
                .set({ points: sp.points, updatedAt: new Date() })
                .where(eq(predictions.id, sp.id));
            }

            scored += matchPredictions.length;
          }
        }
      }
    }
  }

  return { inserted, updated, scored };
}
