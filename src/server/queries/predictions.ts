import { db } from "@/lib/db";
import { predictions, matches, users } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function getUserPredictions(userId: string) {
  return db
    .select({
      id: predictions.id,
      homeScore: predictions.homeScore,
      awayScore: predictions.awayScore,
      points: predictions.points,
      createdAt: predictions.createdAt,
      matchHomeTeam: matches.homeTeam,
      matchAwayTeam: matches.awayTeam,
      matchDate: matches.matchDate,
      matchPhase: matches.phase,
      matchHomeScore: matches.homeScore,
      matchAwayScore: matches.awayScore,
      matchStatus: matches.status,
    })
    .from(predictions)
    .innerJoin(matches, eq(predictions.matchId, matches.id))
    .where(eq(predictions.userId, userId))
    .orderBy(asc(matches.matchDate));
}

export async function getMatchPredictions(matchId: string) {
  return db
    .select({
      id: predictions.id,
      homeScore: predictions.homeScore,
      awayScore: predictions.awayScore,
      points: predictions.points,
      userName: users.name,
      userImage: users.image,
    })
    .from(predictions)
    .innerJoin(users, eq(predictions.userId, users.id))
    .where(eq(predictions.matchId, matchId));
}
