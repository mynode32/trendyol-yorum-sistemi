import { prisma } from "../db";
import { hashPassword } from "../auth/password";

type AccountDb = Pick<typeof prisma, "account" | "user" | "product">;

export type CreateAccountResult = {
  accountId: string;
  accountName: string;
  userId: string;
  email: string;
  backfilledProductCount: number;
};

// Generic for any customer — "enwood" is passed in as a CLI argument, never hardcoded here.
export async function createAccount(
  db: AccountDb,
  email: string,
  password: string,
  accountName: string
): Promise<CreateAccountResult> {
  const account = await db.account.create({ data: { name: accountName } });
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { accountId: account.id, email, passwordHash },
  });
  const backfill = await db.product.updateMany({
    where: { accountId: null },
    data: { accountId: account.id },
  });

  return {
    accountId: account.id,
    accountName: account.name,
    userId: user.id,
    email: user.email,
    backfilledProductCount: backfill.count,
  };
}
