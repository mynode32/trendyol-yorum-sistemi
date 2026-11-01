import { describe, expect, it } from "vitest";
import { canAddProduct, PLAN_DEFINITIONS } from "./plans";

describe("plan product quotas", () => {
  it("keeps legacy accounts unlimited so the existing customer is unaffected", () => {
    expect(PLAN_DEFINITIONS.LEGACY.maxProducts).toBeNull();
    expect(canAddProduct("LEGACY", 10_000)).toBe(true);
  });

  it("allows products only up to the plan limit", () => {
    expect(canAddProduct("STARTER", 9)).toBe(true);
    expect(canAddProduct("STARTER", 10)).toBe(false);
    expect(canAddProduct("PRO", 49)).toBe(true);
    expect(canAddProduct("PRO", 50)).toBe(false);
  });
});
