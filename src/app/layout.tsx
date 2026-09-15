import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trendyol Yorum Sistemi",
  description: "Trendyol ürün yorumlarını çeken, filtreleyen ve gösteren sistem",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // proxy.ts imzalar her istek için farklı bir CSP nonce'u üretir; Next'in
  // kendi script/style etiketlerine bu nonce'u otomatik ekleyebilmesi için
  // sayfanın statik değil, istek başına render edilmesi gerekir. headers()
  // okumak bunu zorunlu kılar (aksi halde build-time'da tek bir nonce'suz
  // HTML üretilip cache'lenir ve strict-dynamic tüm script'leri bloklar).
  await headers();
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
