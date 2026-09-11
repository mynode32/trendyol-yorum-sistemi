import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { hashPassword } from "@/lib/auth/password";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const users = await prisma.user.findMany({
    where: { accountId: currentUser.accountId },
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: users });
}

const createUserBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(1024),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("INVALID_BODY", "Geçersiz JSON gövdesi", 400);
  }
  const parsed = createUserBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("INVALID_BODY", "Geçerli bir email ve en az 8 karakterlik bir şifre girin", 400);
  }

  try {
    const user = await prisma.user.create({
      data: {
        accountId: currentUser.accountId,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
      },
      select: { id: true, email: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("CONFLICT", "Bu email zaten kullanımda", 409);
    }
    throw error;
  }
}
