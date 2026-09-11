import { describe, it, expect, vi } from "vitest";
import { createAccount } from "./createAccount";

function fakeDb() {
  return {
    account: {
      create: vi.fn(async ({ data }: { data: { name: string } }) => ({
        id: "account-1",
        name: data.name,
      })),
    },
    user: {
      create: vi.fn(async ({ data }: { data: { accountId: string; email: string; passwordHash: string } }) => ({
        id: "user-1",
        accountId: data.accountId,
        email: data.email,
        passwordHash: data.passwordHash,
      })),
    },
    product: {
      updateMany: vi.fn(async () => ({ count: 3 })),
    },
  };
}

describe("createAccount", () => {
  it("creates an account and user, and backfills unassigned products", async () => {
    const db = fakeDb();

    const result = await createAccount(db as never, "owner@example.com", "s3cret-pass", "some-customer");

    expect(db.account.create).toHaveBeenCalledWith({ data: { name: "some-customer" } });
    expect(db.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ accountId: "account-1", email: "owner@example.com" }),
    });
    expect(db.product.updateMany).toHaveBeenCalledWith({
      where: { accountId: null },
      data: { accountId: "account-1" },
    });
    expect(result).toEqual({
      accountId: "account-1",
      accountName: "some-customer",
      userId: "user-1",
      email: "owner@example.com",
      backfilledProductCount: 3,
    });
  });

  it("stores a bcrypt hash, not the plaintext password", async () => {
    const db = fakeDb();

    await createAccount(db as never, "owner@example.com", "s3cret-pass", "some-customer");

    const passedHash = db.user.create.mock.calls[0][0].data.passwordHash;
    expect(passedHash).not.toBe("s3cret-pass");
    expect(passedHash).toMatch(/^\$2[aby]\$/);
  });
});
