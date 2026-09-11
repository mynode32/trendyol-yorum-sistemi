import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return jsonError("UNAUTHORIZED", "Giriş yapmanız gerekiyor", 401);

  return NextResponse.json({
    email: currentUser.email,
    accountName: currentUser.accountName,
  });
}
