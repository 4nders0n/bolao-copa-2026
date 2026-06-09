import { describe, it, expect } from "vitest";
import { calculatePoints, scoreMatchPredictions } from "@/lib/scoring";

describe("calculatePoints", () => {
  // Tier 10: Exact score
  it("should award 10 points for exact score match", () => {
    expect(
      calculatePoints({
        predictionHome: 2,
        predictionAway: 1,
        actualHome: 2,
        actualAway: 1,
      })
    ).toBe(10);
  });

  it("should award 10 points for 0-0 exact match", () => {
    expect(
      calculatePoints({
        predictionHome: 0,
        predictionAway: 0,
        actualHome: 0,
        actualAway: 0,
      })
    ).toBe(10);
  });

  // Tier 7: Correct winner + goal difference
  it("should award 7 points for correct winner and goal difference", () => {
    expect(
      calculatePoints({
        predictionHome: 3,
        predictionAway: 1,
        actualHome: 2,
        actualAway: 0,
      })
    ).toBe(7);
  });

  it("should award 7 for away winner with same goal difference", () => {
    expect(
      calculatePoints({
        predictionHome: 0,
        predictionAway: 2,
        actualHome: 1,
        actualAway: 3,
      })
    ).toBe(7);
  });

  // Tier 5: Correct winner only
  it("should award 5 points for correct winner but wrong goal difference", () => {
    expect(
      calculatePoints({
        predictionHome: 3,
        predictionAway: 0,
        actualHome: 1,
        actualAway: 0,
      })
    ).toBe(5);
  });

  it("should award 7 for correct draw (goal difference is always 0 for draws)", () => {
    // Both draws have goal difference 0, so this is tier 7
    expect(
      calculatePoints({
        predictionHome: 1,
        predictionAway: 1,
        actualHome: 2,
        actualAway: 2,
      })
    ).toBe(7);
  });

  it("should award 5 for correct winner but wrong goal difference", () => {
    // Predicted home win by 2, actual home win by 1
    expect(
      calculatePoints({
        predictionHome: 3,
        predictionAway: 1,
        actualHome: 2,
        actualAway: 1,
      })
    ).toBe(5);
  });

  // Tier 0: Wrong outcome
  it("should award 0 points for wrong outcome", () => {
    expect(
      calculatePoints({
        predictionHome: 2,
        predictionAway: 0,
        actualHome: 0,
        actualAway: 1,
      })
    ).toBe(0);
  });

  it("should award 0 when predicting home win but result is draw", () => {
    expect(
      calculatePoints({
        predictionHome: 2,
        predictionAway: 1,
        actualHome: 1,
        actualAway: 1,
      })
    ).toBe(0);
  });

  // Boundary values
  it("should handle maximum scores (99-99)", () => {
    expect(
      calculatePoints({
        predictionHome: 99,
        predictionAway: 99,
        actualHome: 99,
        actualAway: 99,
      })
    ).toBe(10);
  });
});

describe("scoreMatchPredictions", () => {
  it("should score all predictions for a match", () => {
    const predictions = [
      { id: "1", homeScore: 2, awayScore: 1 },
      { id: "2", homeScore: 3, awayScore: 0 },
      { id: "3", homeScore: 0, awayScore: 1 },
    ];

    const results = scoreMatchPredictions(predictions, 2, 1);

    expect(results).toEqual([
      { id: "1", points: 10 },
      { id: "2", points: 5 },
      { id: "3", points: 0 },
    ]);
  });
});
