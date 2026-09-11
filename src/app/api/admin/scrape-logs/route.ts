import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const logs = await prisma.scrapeLog.findMany({
    where: { product: { accountId: currentUser.accountId } },
    orderBy: { startedAt: "desc" },
    take: 100,
    include: { product: { select: { name: true } } },
  });
  return NextResponse.json({ data: logs });
}
