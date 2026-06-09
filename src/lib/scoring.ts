// ─── Types ──────────────────────────────────────────────────────────────

export type ScoringTier = 0 | 5 | 7 | 10;

export interface ScoreInput {
  predictionHome: number;
  predictionAway: number;
  actualHome: number;
  actualAway: number;
}

export interface PredictionToScore {
  id: string;
  homeScore: number;
  awayScore: number;
}

export interface ScoredPrediction {
  id: string;
  points: ScoringTier;
}

// ─── Core Scoring Logic ─────────────────────────────────────────────────

/**
 * Calculate points for a single prediction against an actual result.
 *
 * Tiers (mutually exclusive, checked in priority order):
 * - 10: Exact score match
 * -  7: Correct winner + correct goal difference
 * -  5: Correct winner (or correct draw) only
 * -  0: Wrong outcome
 */
export function calculatePoints(input: ScoreInput): ScoringTier {
  const { predictionHome, predictionAway, actualHome, actualAway } = input;

  // Tier 10: Exact score
  if (predictionHome === actualHome && predictionAway === actualAway) {
    return 10;
  }

  const predictionDiff = predictionHome - predictionAway;
  const actualDiff = actualHome - actualAway;

  // Determine outcome sign: positive = home wins, negative = away wins, zero = draw
  const predictionSign = Math.sign(predictionDiff);
  const actualSign = Math.sign(actualDiff);

  // Must have correct outcome (winner or draw) for tiers 5 and 7
  if (predictionSign !== actualSign) {
    return 0;
  }

  // Tier 7: Correct winner + same goal difference
  if (predictionDiff === actualDiff) {
    return 7;
  }

  // Tier 5: Correct winner (or draw) but different goal difference
  return 5;
}

// ─── Batch Scoring ──────────────────────────────────────────────────────

/**
 * Score all predictions for a given match result.
 * Returns scored predictions. On individual failure, preserves null (unscored).
 */
export function scoreMatchPredictions(
  predictions: PredictionToScore[],
  actualHome: number,
  actualAway: number
): ScoredPrediction[] {
  return predictions.map((prediction) => {
    const points = calculatePoints({
      predictionHome: prediction.homeScore,
      predictionAway: prediction.awayScore,
      actualHome,
      actualAway,
    });

    return { id: prediction.id, points };
  });
}
