import { describe, it, expect } from "vitest";

describe("Sanity test", () => {
  it("should pass basic assertion to confirm test setup works", () => {
    expect(1 + 1).toBe(2);
  });

  it("should resolve imports from @/ alias", async () => {
    const { calculatePoints } = await import("@/lib/scoring");
    expect(typeof calculatePoints).toBe("function");
  });
});
