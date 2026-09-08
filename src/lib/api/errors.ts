import { NextResponse } from "next/server";

// Tüm API hataları tek bir { error: { code, message } } formatında döner.
export function jsonError(
  code: string,
  message: string,
  status: number,
  headers?: HeadersInit
) {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}
