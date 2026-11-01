import { describe, expect, it } from "vitest";
import { canAddProduct, canUsePlanForProductCount, PLAN_DEFINITIONS } from "./plans";

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

  it("does not allow a manual downgrade below the current product count", () => {
    expect(canUsePlanForProductCount("STARTER", 10)).toBe(true);
    expect(canUsePlanForProductCount("STARTER", 11)).toBe(false);
    expect(canUsePlanForProductCount("LEGACY", 1_000)).toBe(true);
  });
});
