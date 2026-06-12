import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { predictions, users, matches } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // Get all predictions with their scores
  const allPredictions = await db
    .select({
      predictionId: predictions.id,
      userId: predictions.userId,
      userName: users.name,
      matchId: predictions.matchId,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      predHome: predictions.homeScore,
      predAway: predictions.awayScore,
      points: predictions.points,
      matchHome: matches.homeScore,
      matchAway: matches.awayScore,
      matchStatus: matches.status,
    })
    .from(predictions)
    .innerJoin(users, eq(predictions.userId, users.id))
    .innerJoin(matches, eq(predictions.matchId, matches.id));

  return NextResponse.json({
    total: allPredictions.length,
    predictions: allPredictions,
  });
}
