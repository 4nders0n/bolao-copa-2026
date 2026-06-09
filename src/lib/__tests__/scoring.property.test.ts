import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { calculatePoints } from "@/lib/scoring";

// Feature: bolao-copa-setup, Property 6: Scoring tier correctness and mutual exclusivity
describe("Property 6: Scoring tier correctness and mutual exclusivity", () => {
  const scoreArb = fc.integer({ min: 0, max: 99 });

  it("should always return exactly one of 0, 5, 7, or 10", () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, scoreArb, scoreArb, (pH, pA, aH, aA) => {
        const result = calculatePoints({
          predictionHome: pH,
          predictionAway: pA,
          actualHome: aH,
          actualAway: aA,
        });
        expect([0, 5, 7, 10]).toContain(result);
      }),
      { numRuns: 1000 }
    );
  });

  it("should award 10 iff exact match", () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, scoreArb, scoreArb, (pH, pA, aH, aA) => {
        const result = calculatePoints({
          predictionHome: pH,
          predictionAway: pA,
          actualHome: aH,
          actualAway: aA,
        });
        const isExact = pH === aH && pA === aA;
        if (isExact) {
          expect(result).toBe(10);
        } else {
          expect(result).not.toBe(10);
        }
      }),
      { numRuns: 1000 }
    );
  });

  it("should award 7 iff correct winner + correct goal difference but not exact", () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, scoreArb, scoreArb, (pH, pA, aH, aA) => {
        const result = calculatePoints({
          predictionHome: pH,
          predictionAway: pA,
          actualHome: aH,
          actualAway: aA,
        });
        const isExact = pH === aH && pA === aA;
        const sameOutcome = Math.sign(pH - pA) === Math.sign(aH - aA);
        const sameDiff = pH - pA === aH - aA;
        const shouldBe7 = !isExact && sameOutcome && sameDiff;
        if (shouldBe7) {
          expect(result).toBe(7);
        }
      }),
      { numRuns: 1000 }
    );
  });

  it("should award 5 iff correct winner but different goal difference", () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, scoreArb, scoreArb, (pH, pA, aH, aA) => {
        const result = calculatePoints({
          predictionHome: pH,
          predictionAway: pA,
          actualHome: aH,
          actualAway: aA,
        });
        const sameOutcome = Math.sign(pH - pA) === Math.sign(aH - aA);
        const sameDiff = pH - pA === aH - aA;
        const shouldBe5 = sameOutcome && !sameDiff;
        if (shouldBe5) {
          expect(result).toBe(5);
        }
      }),
      { numRuns: 1000 }
    );
  });

  it("should award 0 iff wrong outcome", () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, scoreArb, scoreArb, (pH, pA, aH, aA) => {
        const result = calculatePoints({
          predictionHome: pH,
          predictionAway: pA,
          actualHome: aH,
          actualAway: aA,
        });
        const sameOutcome = Math.sign(pH - pA) === Math.sign(aH - aA);
        if (!sameOutcome) {
          expect(result).toBe(0);
        }
      }),
      { numRuns: 1000 }
    );
  });
});
