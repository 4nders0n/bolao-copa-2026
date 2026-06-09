import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  calculateRanking,
  calculatePhaseRanking,
  shouldDisplayPhaseRanking,
  isPhaseFinalized,
} from "@/lib/ranking";
import type { ScoredPredictionForRanking } from "@/lib/ranking";

const pointsArb = fc.constantFrom(0, 5, 7, 10, null);
const phaseArb = fc.constantFrom(
  "group_stage",
  "round_of_32",
  "round_of_16",
  "quarter_finals",
  "semi_finals",
  "third_place",
  "final"
);

const predictionArb = fc.record({
  userId: fc.stringOf(fc.constantFrom("u1", "u2", "u3", "u4", "u5"), {
    minLength: 2,
    maxLength: 2,
  }),
  userName: fc.constantFrom("Alice", "Bob", "Charlie", "Dave", "Eve"),
  matchId: fc.uuid(),
  matchPhase: phaseArb,
  points: pointsArb,
  createdAt: fc.date({ min: new Date("2026-06-01"), max: new Date("2026-07-30") }),
});

// Feature: bolao-copa-setup, Property 7: Total score is sum of scored predictions
describe("Property 7: Total score is sum of scored predictions", () => {
  it("each user total score equals sum of their non-null points", () => {
    fc.assert(
      fc.property(fc.array(predictionArb, { minLength: 1, maxLength: 30 }), (predictions) => {
        const ranking = calculateRanking(predictions);

        for (const user of ranking) {
          const userPreds = predictions.filter(
            (p) => p.userId === user.userId && p.points !== null
          );
          const expectedTotal = userPreds.reduce(
            (sum, p) => sum + (p.points ?? 0),
            0
          );
          expect(user.totalScore).toBe(expectedTotal);
        }
      }),
      { numRuns: 200 }
    );
  });
});

// Feature: bolao-copa-setup, Property 8: Overall ranking order
describe("Property 8: Overall ranking order", () => {
  it("ranking is sorted by total score descending", () => {
    fc.assert(
      fc.property(fc.array(predictionArb, { minLength: 2, maxLength: 30 }), (predictions) => {
        const ranking = calculateRanking(predictions);

        for (let i = 1; i < ranking.length; i++) {
          expect(ranking[i - 1].totalScore).toBeGreaterThanOrEqual(
            ranking[i].totalScore
          );
        }
      }),
      { numRuns: 200 }
    );
  });

  it("positions are sequential starting from 1", () => {
    fc.assert(
      fc.property(fc.array(predictionArb, { minLength: 1, maxLength: 20 }), (predictions) => {
        const ranking = calculateRanking(predictions);
        ranking.forEach((user, idx) => {
          expect(user.position).toBe(idx + 1);
        });
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: bolao-copa-setup, Property 9: Phase ranking scoping
describe("Property 9: Phase ranking scoping", () => {
  it("phase ranking only sums points from the specified phase", () => {
    fc.assert(
      fc.property(
        fc.array(predictionArb, { minLength: 1, maxLength: 30 }),
        phaseArb,
        (predictions, phase) => {
          const ranking = calculatePhaseRanking(predictions, phase);

          for (const user of ranking) {
            const userPhasePreds = predictions.filter(
              (p) =>
                p.userId === user.userId &&
                p.matchPhase === phase &&
                p.points !== null
            );
            const expectedScore = userPhasePreds.reduce(
              (sum, p) => sum + (p.points ?? 0),
              0
            );
            expect(user.phaseScore).toBe(expectedScore);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

// Feature: bolao-copa-setup, Property 10: Phase ranking display condition
describe("Property 10: Phase ranking display condition", () => {
  it("displays iff at least one match is finished", () => {
    const statusArb = fc.constantFrom("scheduled", "live", "finished");
    fc.assert(
      fc.property(fc.array(fc.record({ status: statusArb }), { minLength: 1, maxLength: 10 }), (matches) => {
        const result = shouldDisplayPhaseRanking(matches);
        const hasFinished = matches.some((m) => m.status === "finished");
        expect(result).toBe(hasFinished);
      }),
      { numRuns: 200 }
    );
  });
});

// Feature: bolao-copa-setup, Property 11: Phase ranking finalization
describe("Property 11: Phase ranking finalization", () => {
  it("finalized iff all matches finished and array not empty", () => {
    const statusArb = fc.constantFrom("scheduled", "live", "finished");
    fc.assert(
      fc.property(fc.array(fc.record({ status: statusArb }), { minLength: 0, maxLength: 10 }), (matches) => {
        const result = isPhaseFinalized(matches);
        const expected =
          matches.length > 0 && matches.every((m) => m.status === "finished");
        expect(result).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });
});

// Feature: bolao-copa-setup, Property 12: Phase ranking order
describe("Property 12: Phase ranking order", () => {
  it("phase ranking sorted by score desc, then exact desc, then name asc", () => {
    fc.assert(
      fc.property(
        fc.array(predictionArb, { minLength: 2, maxLength: 30 }),
        phaseArb,
        (predictions, phase) => {
          const ranking = calculatePhaseRanking(predictions, phase);

          for (let i = 1; i < ranking.length; i++) {
            const prev = ranking[i - 1];
            const curr = ranking[i];

            if (prev.phaseScore !== curr.phaseScore) {
              expect(prev.phaseScore).toBeGreaterThan(curr.phaseScore);
            } else if (prev.exactPredictions !== curr.exactPredictions) {
              expect(prev.exactPredictions).toBeGreaterThan(
                curr.exactPredictions
              );
            } else {
              expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
