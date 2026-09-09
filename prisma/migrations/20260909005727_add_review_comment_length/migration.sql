-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "commentLength" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Review_productId_commentLength_idx" ON "Review"("productId", "commentLength");
