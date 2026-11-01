import { prisma } from "../src/lib/db";
import { createAccount } from "../src/lib/accounts/createAccount";
import { ACCOUNT_PLANS, type AccountPlan } from "../src/lib/billing/plans";

async function main() {
  const [email, password, accountName, rawPlan] = process.argv.slice(2);

  if (!email || !password || !accountName) {
    console.error("Kullanım: tsx scripts/create-account.ts <email> <şifre> <hesap-adı> [STARTER|PRO]");
    process.exit(1);
  }

  const plan = rawPlan ?? "STARTER";
  if (!ACCOUNT_PLANS.includes(plan as AccountPlan) || plan === "LEGACY") {
    console.error("Yeni hesap planı STARTER veya PRO olmalı.");
    process.exit(1);
  }

  const result = await createAccount(prisma, email, password, accountName, plan as AccountPlan);
  console.log(`Hesap oluşturuldu: ${result.accountName} (${result.accountId})`);
  console.log(`Kullanıcı: ${result.email}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
