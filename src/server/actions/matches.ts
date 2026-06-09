"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/schema";
import { matchResultSchema, isValidStatusTransition } from "@/lib/validations";
import { scoreMatchPredictions } from "@/lib/scoring";
import type { ActionResult } from "./predictions";

export async function registerMatchResult(
  input: unknown
): Promise<ActionResult> {
  // Auth + admin check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Não autenticado" };
  }
  if (session.user.role !== "admin") {
    return { success: false, error: "Acesso restrito a administradores" };
  }

  // Validate input
  const parsed = matchResultSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos" };
  }

  const { matchId, homeScore, awayScore } = parsed.data;

  // Check match exists
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });

  if (!match) {
    return { success: false, error: "Jogo não encontrado" };
  }

  // Validate status transition — must come from "live"
  if (match.status === "scheduled") {
    return {
      success: false,
      error: "Transição de status inválida",
      details: { from: match.status, to: "finished" },
    };
  }

  try {
    // Update match result
    await db
      .update(matches)
      .set({ homeScore, awayScore, status: "finished", updatedAt: new Date() })
      .where(eq(matches.id, matchId));

    // Get all predictions for this match
    const matchPredictions = await db.query.predictions.findMany({
      where: eq(predictions.matchId, matchId),
    });

    // Calculate scores
    const scored = scoreMatchPredictions(
      matchPredictions.map((p) => ({
        id: p.id,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
      })),
      homeScore,
      awayScore
    );

    // Update each prediction with its score
    for (const sp of scored) {
      await db
        .update(predictions)
        .set({ points: sp.points, updatedAt: new Date() })
        .where(eq(predictions.id, sp.id));
    }
  } catch {
    return {
      success: false,
      error: "Erro ao registrar resultado. Pontuações anteriores foram preservadas.",
    };
  }

  return { success: true };
}

export async function updateMatchStatus(
  matchId: string,
  toStatus: "live" | "finished"
): Promise<ActionResult> {
  // Auth + admin check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Não autenticado" };
  }
  if (session.user.role !== "admin") {
    return { success: false, error: "Acesso restrito a administradores" };
  }

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });

  if (!match) {
    return { success: false, error: "Jogo não encontrado" };
  }

  const fromStatus = match.status as "scheduled" | "live" | "finished";
  if (!isValidStatusTransition(fromStatus, toStatus)) {
    return {
      success: false,
      error: "Transição de status inválida",
      details: { from: fromStatus, to: toStatus },
    };
  }

  // If finishing, require scores
  if (toStatus === "finished") {
    if (match.homeScore === null || match.awayScore === null) {
      return {
        success: false,
        error: "Placar obrigatório para finalizar jogo",
      };
    }
  }

  await db
    .update(matches)
    .set({ status: toStatus, updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  return { success: true };
}
