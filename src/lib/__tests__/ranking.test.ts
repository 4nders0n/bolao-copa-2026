import { describe, it, expect } from "vitest";
import {
  calculateRanking,
  calculatePhaseRanking,
  shouldDisplayPhaseRanking,
  isPhaseFinalized,
} from "@/lib/ranking";
import type { ScoredPredictionForRanking } from "@/lib/ranking";

describe("calculateRanking", () => {
  it("should return empty array for no predictions", () => {
    expect(calculateRanking([])).toEqual([]);
  });

  it("should rank users by total score descending", () => {
    const predictions: ScoredPredictionForRanking[] = [
      { userId: "u1", userName: "Alice", matchId: "m1", matchPhase: "group_stage", points: 10, createdAt: new Date("2026-06-15") },
      { userId: "u2", userName: "Bob", matchId: "m1", matchPhase: "group_stage", points: 5, createdAt: new Date("2026-06-15") },
      { userId: "u1", userName: "Alice", matchId: "m2", matchPhase: "group_stage", points: 5, createdAt: new Date("2026-06-16") },
    ];

    const ranking = calculateRanking(predictions);
    expect(ranking[0].name).toBe("Alice");
    expect(ranking[0].totalScore).toBe(15);
    expect(ranking[1].name).toBe("Bob");
    expect(ranking[1].totalScore).toBe(5);
  });

  it("should use exact predictions as tiebreaker", () => {
    const predictions: ScoredPredictionForRanking[] = [
      { userId: "u1", userName: "Alice", matchId: "m1", matchPhase: "group_stage", points: 5, createdAt: new Date("2026-06-15") },
      { userId: "u1", userName: "Alice", matchId: "m2", matchPhase: "group_stage", points: 5, createdAt: new Date("2026-06-16") },
      { userId: "u2", userName: "Bob", matchId: "m1", matchPhase: "group_stage", points: 10, createdAt: new Date("2026-06-15") },
    ];

    const ranking = calculateRanking(predictions);
    // Both have 10 points, but Bob has 1 exact prediction
    expect(ranking[0].name).toBe("Bob");
    expect(ranking[1].name).toBe("Alice");
  });

  it("should place users with zero scored predictions at bottom", () => {
    const predictions: ScoredPredictionForRanking[] = [
      { userId: "u1", userName: "Alice", matchId: "m1", matchPhase: "group_stage", points: null, createdAt: new Date("2026-06-15") },
      { userId: "u2", userName: "Bob", matchId: "m1", matchPhase: "group_stage", points: 5, createdAt: new Date("2026-06-15") },
    ];

    const ranking = calculateRanking(predictions);
    expect(ranking[0].name).toBe("Bob");
    expect(ranking[1].name).toBe("Alice");
    expect(ranking[1].totalScore).toBe(0);
  });
});

describe("calculatePhaseRanking", () => {
  it("should only include predictions from the specified phase", () => {
    const predictions: ScoredPredictionForRanking[] = [
      { userId: "u1", userName: "Alice", matchId: "m1", matchPhase: "group_stage", points: 10, createdAt: new Date("2026-06-15") },
      { userId: "u1", userName: "Alice", matchId: "m2", matchPhase: "round_of_16", points: 5, createdAt: new Date("2026-06-20") },
    ];

    const ranking = calculatePhaseRanking(predictions, "group_stage");
    expect(ranking).toHaveLength(1);
    expect(ranking[0].phaseScore).toBe(10);
  });

  it("should use alphabetical name as second tiebreaker", () => {
    const predictions: ScoredPredictionForRanking[] = [
      { userId: "u1", userName: "Charlie", matchId: "m1", matchPhase: "group_stage", points: 5, createdAt: new Date("2026-06-15") },
      { userId: "u2", userName: "Alice", matchId: "m1", matchPhase: "group_stage", points: 5, createdAt: new Date("2026-06-15") },
    ];

    const ranking = calculatePhaseRanking(predictions, "group_stage");
    expect(ranking[0].name).toBe("Alice");
    expect(ranking[1].name).toBe("Charlie");
  });
});

describe("shouldDisplayPhaseRanking", () => {
  it("should return true if at least one match is finished", () => {
    expect(shouldDisplayPhaseRanking([{ status: "scheduled" }, { status: "finished" }])).toBe(true);
  });

  it("should return false if no matches are finished", () => {
    expect(shouldDisplayPhaseRanking([{ status: "scheduled" }, { status: "live" }])).toBe(false);
  });
});

describe("isPhaseFinalized", () => {
  it("should return true if all matches are finished", () => {
    expect(isPhaseFinalized([{ status: "finished" }, { status: "finished" }])).toBe(true);
  });

  it("should return false if any match is not finished", () => {
    expect(isPhaseFinalized([{ status: "finished" }, { status: "live" }])).toBe(false);
  });

  it("should return false for empty array", () => {
    expect(isPhaseFinalized([])).toBe(false);
  });
});
