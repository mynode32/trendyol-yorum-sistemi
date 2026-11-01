import { prisma } from "../db";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../auth/password";
import type { AccountPlan } from "../billing/plans";

type AccountDb = Pick<typeof prisma, "account" | "user">;

export type CreateAccountResult = {
  accountId: string;
  accountName: string;
  userId: string;
  email: string;
};

// Generic for any customer — no hardcoded names.
export async function createAccount(
  db: AccountDb,
  email: string,
  password: string,
  accountName: string,
  plan: AccountPlan = "STARTER"
): Promise<CreateAccountResult> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Parola en az ${PASSWORD_MIN_LENGTH} karakter olmalı`);
  }

  const account = await db.account.create({ data: { name: accountName, plan } });
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { accountId: account.id, email, passwordHash },
  });

  return {
    accountId: account.id,
    accountName: account.name,
    userId: user.id,
    email: user.email,
  };
}
