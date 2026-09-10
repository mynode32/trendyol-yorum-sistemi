-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reviewGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Product_reviewGroupId_idx" ON "Product"("reviewGroupId");
