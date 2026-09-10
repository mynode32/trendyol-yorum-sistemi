-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "externalRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_externalRef_key" ON "Product"("externalRef");
