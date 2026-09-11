import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "./db";

describe("prisma client", () => {
  it("connects and can create/delete a product", async () => {
    const product = await prisma.product.create({
      data: {
        trendyolProductId: "test-123",
        trendyolUrl: "https://www.trendyol.com/test-123",
        name: "Test Ürün",
        account: { create: { name: "test-account" } },
      },
    });
    expect(product.id).toBeDefined();
    expect(product.isTracked).toBe(true);

    await prisma.product.delete({ where: { id: product.id } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
