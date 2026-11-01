import { prisma } from "../src/lib/db";
import { isSellablePlan, createInviteToken, hashInviteToken, inviteExpiry } from "../src/lib/onboarding/invites";

async function main() {
  const [email, accountName, joinBaseUrl, rawPlan = "STARTER"] = process.argv.slice(2);
  if (!email || !accountName || !joinBaseUrl || !isSellablePlan(rawPlan)) {
    console.error("Kullanım: tsx scripts/create-signup-invite.ts <email> <hesap-adı> <join-url-temeli> [STARTER|PRO]");
    process.exit(1);
  }

  let joinUrl: URL;
  try {
    joinUrl = new URL(joinBaseUrl);
    if (joinUrl.protocol !== "https:") throw new Error("HTTPS gerekli");
  } catch {
    console.error("join-url-temeli geçerli bir HTTPS adresi olmalı.");
    process.exit(1);
  }

  const token = createInviteToken();
  await prisma.signupInvite.create({
    data: {
      email: email.trim().toLowerCase(),
      accountName: accountName.trim(),
      plan: rawPlan,
      tokenHash: hashInviteToken(token),
      expiresAt: inviteExpiry(),
    },
  });

  const basePath = joinUrl.pathname.replace(/\/$/, "");
  joinUrl.pathname = `${basePath}/join/${token}`;
  console.log(`Davet bağlantısı (7 gün geçerli): ${joinUrl.toString()}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Davet oluşturulamadı:", error instanceof Error ? error.constructor.name : "UnknownError");
  await prisma.$disconnect();
  process.exit(1);
});
