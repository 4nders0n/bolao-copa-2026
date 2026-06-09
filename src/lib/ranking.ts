import type { Phase } from "./validations";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ScoredPredictionForRanking {
  userId: string;
  userName: string;
  matchId: string;
  matchPhase: string;
  points: number | null;
  createdAt: Date;
}

export interface RankedUser {
  position: number;
  userId: string;
  name: string;
  totalScore: number;
  exactPredictions: number;
}

export interface PhaseRankedUser {
  position: number;
  userId: string;
  name: string;
  phaseScore: number;
  exactPredictions: number;
}

// ─── Overall Ranking ────────────────────────────────────────────────────

/**
 * Calculate overall ranking from all scored predictions.
 *
 * Order:
 * 1. Total score descending
 * 2. Number of exact predictions (10 points) descending
 * 3. Earliest exact prediction timestamp ascending
 *
 * Users with zero scored predictions appear at the bottom.
 */
export function calculateRanking(
  predictions: ScoredPredictionForRanking[]
): RankedUser[] {
  // Group by user
  const userMap = new Map<
    string,
    {
      name: string;
      totalScore: number;
      exactPredictions: number;
      earliestExact: Date | null;
      hasScored: boolean;
    }
  >();

  for (const pred of predictions) {
    const existing = userMap.get(pred.userId) ?? {
      name: pred.userName,
      totalScore: 0,
      exactPredictions: 0,
      earliestExact: null,
      hasScored: false,
    };

    if (pred.points !== null) {
      existing.hasScored = true;
      existing.totalScore += pred.points;

      if (pred.points === 10) {
        existing.exactPredictions += 1;
        if (
          existing.earliestExact === null ||
          pred.createdAt < existing.earliestExact
        ) {
          existing.earliestExact = pred.createdAt;
        }
      }
    }

    existing.name = pred.userName;
    userMap.set(pred.userId, existing);
  }

  // Sort
  const sorted = [...userMap.entries()].sort(([, a], [, b]) => {
    // Users with scores before users without
    if (a.hasScored && !b.hasScored) return -1;
    if (!a.hasScored && b.hasScored) return 1;

    // Higher total score first
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;

    // More exact predictions first
    if (b.exactPredictions !== a.exactPredictions)
      return b.exactPredictions - a.exactPredictions;

    // Earlier exact prediction first
    if (a.earliestExact && b.earliestExact) {
      return a.earliestExact.getTime() - b.earliestExact.getTime();
    }
    if (a.earliestExact) return -1;
    if (b.earliestExact) return 1;

    return 0;
  });

  return sorted.map(([userId, data], index) => ({
    position: index + 1,
    userId,
    name: data.name,
    totalScore: data.totalScore,
    exactPredictions: data.exactPredictions,
  }));
}

// ─── Phase Ranking ──────────────────────────────────────────────────────

/**
 * Calculate ranking for a specific tournament phase.
 *
 * Only includes users with at least one prediction in the given phase.
 *
 * Order:
 * 1. Phase points descending
 * 2. Exact predictions in phase descending
 * 3. Alphabetical name ascending
 */
export function calculatePhaseRanking(
  predictions: ScoredPredictionForRanking[],
  phase: Phase
): PhaseRankedUser[] {
  // Filter to phase predictions only
  const phasePredictions = predictions.filter(
    (p) => p.matchPhase === phase && p.points !== null
  );

  // Group by user
  const userMap = new Map<
    string,
    { name: string; phaseScore: number; exactPredictions: number }
  >();

  for (const pred of phasePredictions) {
    const existing = userMap.get(pred.userId) ?? {
      name: pred.userName,
      phaseScore: 0,
      exactPredictions: 0,
    };

    existing.phaseScore += pred.points!;
    if (pred.points === 10) {
      existing.exactPredictions += 1;
    }
    existing.name = pred.userName;
    userMap.set(pred.userId, existing);
  }

  // Sort
  const sorted = [...userMap.entries()].sort(([, a], [, b]) => {
    if (b.phaseScore !== a.phaseScore) return b.phaseScore - a.phaseScore;
    if (b.exactPredictions !== a.exactPredictions)
      return b.exactPredictions - a.exactPredictions;
    return a.name.localeCompare(b.name);
  });

  return sorted.map(([userId, data], index) => ({
    position: index + 1,
    userId,
    name: data.name,
    phaseScore: data.phaseScore,
    exactPredictions: data.exactPredictions,
  }));
}

// ─── Phase Helpers ──────────────────────────────────────────────────────

interface MatchForPhaseCheck {
  status: string;
}

/**
 * Returns true if the phase should display a ranking
 * (at least one match is finished).
 */
export function shouldDisplayPhaseRanking(
  matches: MatchForPhaseCheck[]
): boolean {
  return matches.some((m) => m.status === "finished");
}

/**
 * Returns true if the phase ranking is final
 * (all matches are finished).
 */
export function isPhaseFinalized(matches: MatchForPhaseCheck[]): boolean {
  return matches.length > 0 && matches.every((m) => m.status === "finished");
}
