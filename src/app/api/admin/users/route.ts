import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { hashPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { requireSameOrigin } from "@/lib/api/csrf";
import { requireRole } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const authorizationError = requireRole(currentUser, ["OWNER"]);
  if (authorizationError) return authorizationError;

  const users = await prisma.user.findMany({
    where: { accountId: currentUser.accountId },
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: users });
}

const createUserBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(1024),
  role: z.enum(["ADMIN", "VIEWER"]).default("VIEWER"),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const authorizationError = requireRole(currentUser, ["OWNER"]);
  if (authorizationError) return authorizationError;

  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("INVALID_BODY", "Geçersiz JSON gövdesi", 400);
  }
  const parsed = createUserBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("INVALID_BODY", `Geçerli bir email ve en az ${PASSWORD_MIN_LENGTH} karakterlik bir şifre girin`, 400);
  }

  try {
    const user = await prisma.user.create({
      data: {
        accountId: currentUser.accountId,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    await writeAuditLog({
      accountId: currentUser.accountId,
      actorUserId: currentUser.userId,
      action: "USER_CREATED",
      targetType: "user",
      targetId: user.id,
      metadata: { email: user.email, role: user.role },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("CONFLICT", "Bu email zaten kullanımda", 409);
    }
    throw error;
  }
}
