import { prisma } from "../src/lib/db";
import { createAccount } from "../src/lib/accounts/createAccount";

async function main() {
  const [email, password, accountName] = process.argv.slice(2);

  if (!email || !password || !accountName) {
    console.error("Kullanım: tsx scripts/create-account.ts <email> <şifre> <hesap-adı>");
    process.exit(1);
  }

  const result = await createAccount(prisma, email, password, accountName);
  console.log(`Hesap oluşturuldu: ${result.accountName} (${result.accountId})`);
  console.log(`Kullanıcı: ${result.email}`);
  console.log(`Geriye dönük eşlenen ürün sayısı: ${result.backfilledProductCount}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
