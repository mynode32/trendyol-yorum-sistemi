import { prisma } from "../src/lib/db";
import { ACCOUNT_PLANS, canUsePlanForProductCount, type AccountPlan } from "../src/lib/billing/plans";

async function main() {
  const [email, rawPlan] = process.argv.slice(2);
  if (!email || !rawPlan || !ACCOUNT_PLANS.includes(rawPlan as AccountPlan)) {
    console.error("Kullanım: tsx scripts/change-account-plan.ts <hesap-sahibi-email> <LEGACY|STARTER|PRO>");
    process.exit(1);
  }
  const plan = rawPlan as AccountPlan;
  const owner = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), role: "OWNER" },
    select: { accountId: true, account: { select: { name: true, plan: true } } },
  });
  if (!owner) {
    console.error("Hesap sahibi bulunamadı.");
    process.exit(1);
  }

  const productCount = await prisma.product.count({ where: { accountId: owner.accountId } });
  if (!canUsePlanForProductCount(plan, productCount)) {
    console.error(`Plan değiştirilemedi: hesapta ${productCount} ürün var, seçilen planın kotası daha düşük.`);
    process.exit(1);
  }

  await prisma.account.update({ where: { id: owner.accountId }, data: { plan } });
  console.log(`${owner.account.name}: ${owner.account.plan} → ${plan} (${productCount} ürün)`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Plan değiştirilemedi:", error instanceof Error ? error.constructor.name : "UnknownError");
  await prisma.$disconnect();
  process.exit(1);
});
