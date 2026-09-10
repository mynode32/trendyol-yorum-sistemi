import { prisma } from "../src/lib/db";
import { fetchProductInfo } from "../src/lib/scraper/trendyolClient";

// Trendyol ürün başlığı (fetchProductInfo'nun og:title'ı) -> Enwood site stok kodu.
// Elle gözden geçirilip doğrulandı (bkz. match-enwood-refs.ts kuru-çalıştırma çıktısı).
// Haritada olmayan başlıklar bilinçli olarak atlanır: ya aynı SKU'ya işaret eden
// renk/tekrar varyantı (tek Enwood sayfasına birden fazla Trendyol listesi), ya da
// katalogda karşılığı bulunamayan ürün (yanlış eşleştirmektense boş bırakılır).
const TITLE_TO_SKU: Record<string, string> = {
  "enwood DENEB MDF KUM TAŞI RENGİ 4 Kapaklı(Panjur Kapak) Ahşap Ayaklı Kiler Dolabı - Fiyatı, Yorumları": "14ca66d9",
  "enwood CAPELLA KUMTAŞI MDF ÇOK AMAÇLI KİLER-MUTFAK DOLABI 158 CM - Fiyatı, Yorumları": "ee64a3ef",
  "enwood Capella Beyaz Mdf 5 Kapaklı Raflı 180 Lik Konsol - Fiyatı, Yorumları": "5c7a8cbf",
  "enwood Capella Kumtaşı Rengi Mdf 5 Kapaklı Ahşap Ayaklı 200 Cm Tv Ünitesi - Fiyatı, Yorumları": "7e2be4f9",
  "enwood Avior BEYAZ Kahve Köşesi MDF 185 x 120 x 40 CM - Fiyatı, Yorumları": "efe6990b",
  "enwood Capella MDF Ayakkabılık ve Çok Amaçlı Dolap Raflı ve Kapaklı 60 cm - Fiyatı, Yorumları": "2ZBF6T98J4",
  "enwood CAPELLA KUMTAŞI MDF ÇOK AMAÇLI BANYO DOLABI 138x34 CM - Fiyatı, Yorumları": "95ee77c7",
  "enwood Capella Kumtaşı Rengi Mdf 3 Kapaklı Ahşap Ayaklı 140 Cm Tv Ünitesi - Fiyatı, Yorumları": "9380997b",
  "enwood Capella TV ünitesi Kumtaşı MDF 120 cm duvara monte kapaklı raflı - Fiyatı, Yorumları": "61370f6a",
  "enwood REGULUS MDF 2 KAPAKLI AHŞAP AYAKLI 140 Cm COUNTRY TV ÜNİTESİ - Fiyatı, Yorumları": "3ba3bab3",
  "enwood Capella Kumtaşı Rengi Mdf 4 Kapaklı Ahşap Ayaklı 160 Cm Tv Ünitesi - Fiyatı, Yorumları": "8a3aedcc",
  "enwood MİMOSA MDF DUVARA MONTE KAPAKLI DRESUAR,Makyaj masası (90 cm) - Fiyatı, Yorumları": "36f153dd",
  "enwood Tv Ünitesi Ahşap Ayak 19 Cm Kum Taşı Rengi(5 ADET) - Fiyatı, Yorumları": "60ae9d2e",
  "enwood Capella Mdf 5 Kapaklı Raflı Ahşap Ayaklı 200 cm Konsol (200X80X40 CM) - Fiyatı, Yorumları": "5155ab94",
  "enwood MİMOSA MDF DUVARA MONTE KAPAKLI DRESUAR,Makyaj masası (50 cm) - Fiyatı, Yorumları": "b11acd5c",
  "enwood Capella Kumtaşı Rengi Mdf 4 Kapaklı Duvara Monte 160 Cm Tv Ünitesi - Fiyatı, Yorumları": "6f9f8bd4",
  "enwood Capella Kumtaşı Rengi Mdf 4 Kapaklı Ahşap Ayaklı 180 Cm Tv Ünitesi - Fiyatı, Yorumları": "e1242c27",
  "enwood Capella MDF 3 Kapaklı Konsol 120 cm - Fiyatı, Yorumları": "c9512d97",
  "enwood CAPELLA Mdf 6 Kapaklı Duvara Monte KUMTAŞI (120 CM X 2 ADET) 240 Cm Tv Ünitesi - Fiyatı, Yorumları": "438bd0a7",
  "enwood Capella Tv Ünitesi kumtaşı MDF 120 cm ayaklı kapaklı raflı - Fiyatı, Yorumları": "f9d10d50",
  "enwood MAGNETAR BEYAZ MDF KİLER DOLABI AHŞAP AYAKLI PANJUR KAPAKLI-RAFLI - Fiyatı, Yorumları": "45782946",
};

async function main() {
  const products = await prisma.product.findMany({
    where: { storeId: "enwood", externalRef: null },
    orderBy: { id: "asc" },
  });
  console.log(`${products.length} ürün kontrol edilecek.\n`);

  let applied = 0;
  let skipped = 0;

  for (const p of products) {
    const info = await fetchProductInfo(p.trendyolUrl);
    const title = info.name ?? "";
    const sku = TITLE_TO_SKU[title];

    if (!sku) {
      console.log(`ATLANDI: "${title}"`);
      skipped += 1;
      continue;
    }

    try {
      await prisma.product.update({
        where: { id: p.id },
        data: { externalRef: sku, ...(info.name ? { name: info.name } : {}), ...(info.imageUrl ? { imageUrl: info.imageUrl } : {}) },
      });
      console.log(`UYGULANDI: "${title}" -> ${sku}`);
      applied += 1;
    } catch (error) {
      const isUniqueConflict =
        error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
      if (!isUniqueConflict) throw error;
      console.log(`ATLANDI (${sku} zaten kullanımda, aynı başlıktan tekrar): "${title}"`);
      skipped += 1;
    }
  }

  console.log(`\nToplam: ${applied} eşleştirildi, ${skipped} atlandı.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
