import { db } from "@/lib/db";
import { predictions, users, matches } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  calculateRanking,
  calculatePhaseRanking,
  type RankedUser,
  type PhaseRankedUser,
} from "@/lib/ranking";
import type { Phase } from "@/lib/validations";

export async function getRanking(): Promise<RankedUser[]> {
  const results = await db
    .select({
      userId: predictions.userId,
      userName: users.name,
      matchId: predictions.matchId,
      matchPhase: matches.phase,
      points: predictions.points,
      createdAt: predictions.createdAt,
    })
    .from(predictions)
    .innerJoin(users, eq(predictions.userId, users.id))
    .innerJoin(matches, eq(predictions.matchId, matches.id));

  const mapped = results.map((r) => ({
    userId: r.userId,
    userName: r.userName ?? "Anônimo",
    matchId: r.matchId,
    matchPhase: r.matchPhase,
    points: r.points,
    createdAt: r.createdAt,
  }));

  return calculateRanking(mapped);
}

export async function getPhaseRanking(
  phase: Phase
): Promise<PhaseRankedUser[]> {
  const results = await db
    .select({
      userId: predictions.userId,
      userName: users.name,
      matchId: predictions.matchId,
      matchPhase: matches.phase,
      points: predictions.points,
      createdAt: predictions.createdAt,
    })
    .from(predictions)
    .innerJoin(users, eq(predictions.userId, users.id))
    .innerJoin(matches, eq(predictions.matchId, matches.id))
    .where(eq(matches.phase, phase));

  const mapped = results.map((r) => ({
    userId: r.userId,
    userName: r.userName ?? "Anônimo",
    matchId: r.matchId,
    matchPhase: r.matchPhase,
    points: r.points,
    createdAt: r.createdAt,
  }));

  return calculatePhaseRanking(mapped, phase);
}
