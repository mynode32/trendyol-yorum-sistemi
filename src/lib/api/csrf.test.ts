import { describe, expect, it } from "vitest";
import { requireSameOrigin } from "./csrf";

describe("requireSameOrigin", () => {
  it("accepts a same-origin state-changing request", () => {
    expect(
      requireSameOrigin(
        new Request("https://admin.example.com/api/admin/products", {
          method: "POST",
          headers: { origin: "https://admin.example.com" },
        })
      )
    ).toBeNull();
  });

  it("rejects missing and cross-origin Origin headers", async () => {
    const missing = requireSameOrigin(new Request("https://admin.example.com/api/admin/products", { method: "POST" }));
    const crossOrigin = requireSameOrigin(
      new Request("https://admin.example.com/api/admin/products", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      })
    );

    expect(missing?.status).toBe(403);
    expect(crossOrigin?.status).toBe(403);
  });
});
