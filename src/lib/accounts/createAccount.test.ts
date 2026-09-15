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

    const result = await createAccount(db as never, "owner@example.com", "s3cret-pass-12", "some-customer");

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

    await createAccount(db as never, "owner@example.com", "s3cret-pass-12", "some-customer");

    const passedHash = db.user.create.mock.calls[0][0].data.passwordHash;
    expect(passedHash).not.toBe("s3cret-pass-12");
    expect(passedHash).toMatch(/^\$2[aby]\$/);
  });

  it("rejects a weak initial password before creating any records", async () => {
    const db = fakeDb();

    await expect(createAccount(db as never, "owner@example.com", "too-short", "some-customer")).rejects.toThrow(
      "en az 12 karakter"
    );
    expect(db.account.create).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
  });
});
