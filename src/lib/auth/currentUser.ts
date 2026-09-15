import { prisma } from "../db";
import { verifySessionToken } from "./session";

const SESSION_COOKIE_NAME = "ty_admin_session";

export type CurrentUser = {
  userId: string;
  email: string;
  accountId: string;
  accountName: string;
  role: "OWNER" | "ADMIN" | "VIEWER";
};

function getSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === SESSION_COOKIE_NAME) return rest.join("=");
  }
  return null;
}

export async function getCurrentUser(request: Request): Promise<CurrentUser | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { account: true },
  });
  // Şifre değişince sessionVersion artırılır. Böylece çalınmış/eski cookie,
  // kendi 24 saatlik ömrünü beklemeden geçersiz olur.
  if (!user || user.sessionVersion !== session.sessionVersion) return null;

  return {
    userId: user.id,
    email: user.email,
    accountId: user.accountId,
    accountName: user.account.name,
    role: user.role,
  };
}
