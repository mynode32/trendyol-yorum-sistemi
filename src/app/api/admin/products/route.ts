import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { requireSameOrigin } from "@/lib/api/csrf";
import { PRODUCT_MANAGERS, requireRole } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/audit/log";
import { canAddProduct, PLAN_DEFINITIONS, type AccountPlan } from "@/lib/billing/plans";

function isTrendyolUrl(trendyolUrl: string): boolean {
  try {
    const url = new URL(trendyolUrl);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (hostname === "trendyol.com" || hostname.endsWith(".trendyol.com"))
    );
  } catch {
    return false;
  }
}

function extractProductId(trendyolUrl: string): string | null {
  const match = new URL(trendyolUrl).pathname.match(/-p-(\d+)(?:$|\/)/);
  return match ? match[1] : null;
}

const minRatingSchema = z.number().int().min(1).max(5).optional();
const createProductBodySchema = z.object({
  trendyolUrl: z.string().trim().max(2048),
  minRating: minRatingSchema,
});

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const accountId = currentUser.accountId;

  const [products, ratingAgg, newReviewsLast7Days] = await Promise.all([
    prisma.product.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { reviews: { where: { isDisplayed: true } } } } },
    }),
    prisma.review.aggregate({
      where: { isDisplayed: true, product: { accountId } },
      _avg: { rating: true },
    }),
    prisma.review.count({ where: { createdAt: { gte: sevenDaysAgo }, product: { accountId } } }),
  ]);

  const data = products.map(({ _count, ...product }) => ({
    ...product,
    displayedReviewCount: _count.reviews,
  }));

  return NextResponse.json({
    data,
    summary: {
      accountName: currentUser.accountName,
      accountPlan: currentUser.accountPlan,
      averageRating: ratingAgg._avg.rating,
      newReviewsLast7Days,
    },
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  const authorizationError = requireRole(currentUser, PRODUCT_MANAGERS);
  if (authorizationError) return authorizationError;

  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("INVALID_BODY", "Geçersiz JSON gövdesi", 400);
  }
  const parsedBody = createProductBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return jsonError("INVALID_BODY", "Geçerli bir ürün URL'si ve minRating değeri gönderin", 400);
  }
  const { trendyolUrl, minRating: rawMinRating } = parsedBody.data;

  if (typeof trendyolUrl !== "string" || !isTrendyolUrl(trendyolUrl)) {
    return jsonError("INVALID_URL", "Geçerli bir trendyol.com ürün URL'si girin", 400);
  }

  const trendyolProductId = extractProductId(trendyolUrl);
  if (!trendyolProductId) {
    return jsonError("INVALID_URL", "Ürün ID'si URL'den çıkarılamadı", 400);
  }

  try {
    const account = await prisma.account.findUnique({
      where: { id: currentUser.accountId },
      select: { plan: true },
    });
    if (!account) return jsonError("UNAUTHORIZED", "Hesap bulunamadı", 401);

    const productCount = await prisma.product.count({ where: { accountId: currentUser.accountId } });
    if (!canAddProduct(account.plan as AccountPlan, productCount)) {
      const { maxProducts } = PLAN_DEFINITIONS[account.plan as AccountPlan];
      return jsonError(
        "PLAN_PRODUCT_LIMIT_REACHED",
        `Mevcut planınız en fazla ${maxProducts} ürün destekliyor. Planınızı yükselterek devam edebilirsiniz.`,
        403
      );
    }

    const product = await prisma.product.create({
      data: {
        accountId: currentUser.accountId,
        trendyolProductId,
        trendyolUrl,
        name: `Ürün ${trendyolProductId}`,
        minRating: rawMinRating ?? null,
      },
    });
    await writeAuditLog({
      accountId: currentUser.accountId,
      actorUserId: currentUser.userId,
      action: "PRODUCT_CREATED",
      targetType: "product",
      targetId: product.id,
      metadata: { trendyolProductId: product.trendyolProductId },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("CONFLICT", "Bu ürün zaten ekli", 409);
    }
    throw error;
  }
}
