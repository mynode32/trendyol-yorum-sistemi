CREATE TYPE "AccountPlan" AS ENUM ('LEGACY', 'STARTER', 'PRO');

-- Mevcut müşteri hesapları özellikle LEGACY ile başlar: rollout mevcut
-- ürünleri veya tarama akışını kota nedeniyle kesintiye uğratmaz.
ALTER TABLE "Account" ADD COLUMN "plan" "AccountPlan" NOT NULL DEFAULT 'LEGACY';
