import type { CurrentUser } from "./currentUser";
import { jsonError } from "../api/errors";

export type AdminRole = CurrentUser["role"];

/** İzin verilen rollerden biri yoksa mutasyon/veri erişimini durdurur. */
export function requireRole(currentUser: CurrentUser, allowed: readonly AdminRole[]) {
  if (!allowed.includes(currentUser.role)) {
    return jsonError("FORBIDDEN", "Bu işlem için yeterli yetkiniz yok", 403);
  }
  return null;
}

export const PRODUCT_MANAGERS = ["OWNER", "ADMIN"] as const satisfies readonly AdminRole[];
