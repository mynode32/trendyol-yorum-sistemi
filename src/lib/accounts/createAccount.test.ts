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
  };
}

describe("createAccount", () => {
  it("creates an account and its first user", async () => {
    const db = fakeDb();

    const result = await createAccount(db as never, "owner@example.com", "s3cret-pass", "some-customer");

    expect(db.account.create).toHaveBeenCalledWith({ data: { name: "some-customer" } });
    expect(db.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ accountId: "account-1", email: "owner@example.com" }),
    });
    expect(result).toEqual({
      accountId: "account-1",
      accountName: "some-customer",
      userId: "user-1",
      email: "owner@example.com",
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
