import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  predictionSchema,
  scoreSchema,
  isValidStatusTransition,
} from "@/lib/validations";

// Feature: bolao-copa-setup, Property 5: Prediction score validation
describe("Property 5: Prediction score validation", () => {
  it("accepts integers in [0, 99]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), (value) => {
        const result = scoreSchema.safeParse(value);
        expect(result.success).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("rejects negative integers", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: -1 }), (value) => {
        const result = scoreSchema.safeParse(value);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("rejects integers > 99", () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 10000 }), (value) => {
        const result = scoreSchema.safeParse(value);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("rejects floats", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 98.99, noNaN: true }).filter(
          (v) => !Number.isInteger(v)
        ),
        (value) => {
          const result = scoreSchema.safeParse(value);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects strings", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const result = scoreSchema.safeParse(value);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: bolao-copa-setup, Property 2: Match status transition validity
describe("Property 2: Match status transition validity", () => {
  const statuses = ["scheduled", "live", "finished"] as const;

  it("only allows scheduled→live and live→finished", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...statuses),
        fc.constantFrom(...statuses),
        (from, to) => {
          const result = isValidStatusTransition(from, to);
          const expected =
            (from === "scheduled" && to === "live") ||
            (from === "live" && to === "finished");
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("predictionSchema", () => {
  it("accepts valid prediction input", () => {
    const result = predictionSchema.safeParse({
      matchId: "clx1234567890abcdef12345",
      homeScore: 2,
      awayScore: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing matchId", () => {
    const result = predictionSchema.safeParse({
      homeScore: 2,
      awayScore: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects homeScore > 99", () => {
    const result = predictionSchema.safeParse({
      matchId: "clx1234567890abcdef12345",
      homeScore: 100,
      awayScore: 1,
    });
    expect(result.success).toBe(false);
  });
});
