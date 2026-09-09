// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminFetch } from "./adminFetch";

describe("adminFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls onUnauthorized and still returns the response when the API returns 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const onUnauthorized = vi.fn();

    const response = await adminFetch("/api/admin/products", undefined, onUnauthorized);

    expect(response.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not call onUnauthorized for a successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }))));
    const onUnauthorized = vi.fn();

    await adminFetch("/api/admin/products", undefined, onUnauthorized);

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
