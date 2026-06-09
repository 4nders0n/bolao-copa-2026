"use server";

import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { predictions, matches } from "@/lib/schema";
import { predictionSchema } from "@/lib/validations";
import { randomId } from "@/lib/utils";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; details?: Record<string, string> };

export async function submitPrediction(
  input: unknown
): Promise<ActionResult> {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Não autenticado" };
  }

  // Validate input
  const parsed = predictionSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const details: Record<string, string> = {};
    if (fieldErrors.homeScore) {
      details.homeScore = "Valor deve ser entre 0 e 99";
    }
    if (fieldErrors.awayScore) {
      details.awayScore = "Valor deve ser entre 0 e 99";
    }
    if (fieldErrors.matchId) {
      details.matchId = "ID do jogo inválido";
    }
    return { success: false, error: "Dados inválidos", details };
  }

  const { matchId, homeScore, awayScore } = parsed.data;

  // Check match exists and deadline
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });

  if (!match) {
    return { success: false, error: "Jogo não encontrado" };
  }

  if (new Date() >= match.matchDate) {
    return {
      success: false,
      error: "O prazo para palpites deste jogo já encerrou",
    };
  }

  // Check if prediction already exists
  const existing = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, session.user.id),
      eq(predictions.matchId, matchId)
    ),
  });

  if (existing) {
    // Update existing prediction
    await db
      .update(predictions)
      .set({ homeScore, awayScore, updatedAt: new Date() })
      .where(eq(predictions.id, existing.id));
  } else {
    // Create new prediction
    await db.insert(predictions).values({
      id: randomId(),
      userId: session.user.id,
      matchId,
      homeScore,
      awayScore,
    });
  }

  return { success: true };
}
