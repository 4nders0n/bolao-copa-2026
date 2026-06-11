"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/schema";
import { scoreMatchPredictions } from "@/lib/scoring";
import { matchResultSchema } from "@/lib/validations";

type AdminResult =
  | { success: true; scored: number }
  | { success: false; error: string };

export async function registerResult(input: unknown): Promise<AdminResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Não autenticado" };
  }
  if (session.user.role !== "admin") {
    return { success: false, error: "Acesso restrito a administradores" };
  }

  const parsed = matchResultSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Placar inválido (valores devem ser entre 0 e 99)" };
  }

  const { matchId, homeScore, awayScore } = parsed.data;

  const matchResults = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  const match = matchResults[0];
  if (!match) {
    return { success: false, error: "Jogo não encontrado" };
  }

  await db
    .update(matches)
    .set({
      homeScore,
      awayScore,
      status: "finished",
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));

  const matchPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.matchId, matchId));

  let scored = 0;

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

    scored = scoredPredictions.length;
  }

  return { success: true, scored };
}

export async function updateBroadcast(
  matchId: string,
  channels: string[]
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Não autenticado" };
  }
  if (session.user.role !== "admin") {
    return { success: false, error: "Acesso restrito a administradores" };
  }

  await db
    .update(matches)
    .set({
      broadcast: JSON.stringify(channels),
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));

  return { success: true };
}
