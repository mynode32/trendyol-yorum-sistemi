CREATE TABLE "SignupInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "plan" "AccountPlan" NOT NULL DEFAULT 'STARTER',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SignupInvite_tokenHash_key" ON "SignupInvite"("tokenHash");
CREATE INDEX "SignupInvite_email_idx" ON "SignupInvite"("email");
CREATE INDEX "SignupInvite_expiresAt_idx" ON "SignupInvite"("expiresAt");
