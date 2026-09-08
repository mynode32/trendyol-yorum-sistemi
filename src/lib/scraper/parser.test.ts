import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseReviewResponse } from "./parser";

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), "fixtures/sample-review-response.json"), "utf-8")
);

describe("parseReviewResponse", () => {
  it("parses raw Trendyol response into normalized reviews", () => {
    const result = parseReviewResponse(fixture);

    expect(result.length).toBeGreaterThan(0);
    const first = result[0];
    expect(typeof first.trendyolReviewId).toBe("string");
    expect(first.rating).toBeGreaterThanOrEqual(1);
    expect(first.rating).toBeLessThanOrEqual(5);
    expect(typeof first.comment).toBe("string");
    expect(typeof first.authorName).toBe("string");
    expect(typeof first.hasPhoto).toBe("boolean");
    expect(Array.isArray(first.photoUrls)).toBe(true);
    expect(first.reviewDate instanceof Date).toBe(true);
    expect(typeof first.helpfulCount).toBe("number");
  });
});
