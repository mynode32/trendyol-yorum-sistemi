import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AuditEntry = {
  accountId: string;
  actorUserId: string;
  action:
    | "USER_CREATED"
    | "USER_ROLE_CHANGED"
    | "USER_DELETED"
    | "PASSWORD_CHANGED"
    | "PRODUCT_CREATED"
    | "PRODUCT_UPDATED"
    | "PRODUCT_DELETED"
    | "REVIEW_VISIBILITY_CHANGED"
    | "SCRAPE_REQUESTED"
    | "BULK_IMPORT_COMPLETED";
  targetType: "user" | "product" | "review" | "account";
  targetId: string;
  metadata?: Prisma.InputJsonValue;
};

/** Hassas alanlar (parola/hash/token) asla metadata'ya verilmemelidir. */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({ data: entry });
}
