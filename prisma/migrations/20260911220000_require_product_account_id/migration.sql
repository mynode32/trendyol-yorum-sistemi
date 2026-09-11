-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "accountId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_accountId_fkey";

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
