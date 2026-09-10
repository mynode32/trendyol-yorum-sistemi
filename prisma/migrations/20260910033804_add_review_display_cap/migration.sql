-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "maxDisplayedReviews" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "isDisplayed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Review_productId_isDisplayed_idx" ON "Review"("productId", "isDisplayed");
