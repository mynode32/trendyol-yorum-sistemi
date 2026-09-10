import { prisma } from "../src/lib/db";
import { fetchProductInfo } from "../src/lib/scraper/trendyolClient";

const ENWOOD_CATALOG: { name: string; sku: string }[] = [
  { name: "MODO Çok Amaçlı Dolap - MDF - 176 CM", sku: "X5KJ1QB5FQ" },
  { name: "MİLA TV Ünitesi Ahşap Ayaklı 3 Kapaklı - MDF - 200 CM", sku: "UJZSFJS5EC" },
  { name: "MİLA TV Ünitesi Ahşap Ayaklı 3 Kapaklı - MDF - 180 CM", sku: "65T7ZCTHBE" },
  { name: "MİLA TV Ünitesi Ahşap Ayaklı 2 Kapaklı - MDF - 160 CM", sku: "GZWY8FALN5" },
  { name: "MİLA TV Ünitesi Ahşap Ayaklı 2 Kapaklı - MDF - 140 CM", sku: "P3187TVXG3" },
  { name: "MİLA TV Ünitesi Ahşap Ayaklı 2 Kapaklı - MDF - 120 CM", sku: "71PY5NNGBM" },
  { name: "MİLA Ahşap Ayaklı Konsol - MDF - 200 CM", sku: "X5C21XEDAK" },
  { name: "MİLA Ahşap Ayaklı Konsol - MDF - 180 CM", sku: "RATADMMQBK" },
  { name: "MİLA Ahşap Ayaklı Konsol - MDF - 160 CM", sku: "F85CDYTJMB" },
  { name: "MİLA Ahşap Ayaklı Konsol - MDF - 140 CM", sku: "U1GWTCRDTR" },
  { name: "LİNEA Fırın Dolabı - MDF - 160 CM - Çok Amaçlı Dolap", sku: "T56VP59TNB" },
  { name: "FORME Kahve Köşesi - MDF - 172 CM", sku: "1WBHEW3181" },
  { name: "Capella Ayakkabılık MDF Çok Amaçlı Dolap 60 cm", sku: "2ZBF6T98J4" },
  { name: "Enwood TV Ünitesi Ahşap Ayak 19 cm Gri Renk", sku: "a43de2f7" },
  { name: "19 cm Beyaz TV Ünitesi Ahşap Ayak 5'li Set", sku: "ee8b4fa3" },
  { name: "Spica Safir Meşe TV Ünitesi 140-180 cm Ahşap Ayaklı MDF", sku: "5f46c5a1" },
  { name: "Regulus 160 cm Ahşap Ayaklı TV Ünitesi Country 2 Kapaklı", sku: "38350364" },
  { name: "Regulus 200 cm Ahşap Ayaklı TV Ünitesi Country 3 Kapaklı", sku: "8fe44138" },
  { name: "Regulus 180 cm Ahşap Ayaklı TV Ünitesi Country 3 Kapaklı", sku: "0bac7094" },
  { name: "Regulus 140 cm Ahşap Ayaklı TV Ünitesi Country 2 Kapaklı", sku: "3ba3bab3" },
  { name: "Magnetar Kahve Köşesi MDF Ahşap Ayaklı Panjur Kapaklı Raflı", sku: "45782946" },
  { name: "Deneb Panjur Kapaklı Kiler Dolabı 4 Kapaklı Ahşap Ayaklı", sku: "14ca66d9" },
  { name: "Capella 120 cm Ayaklı TV Ünitesi Kapaklı Raflı MDF", sku: "f9d10d50" },
  { name: "Capella 120 cm Duvara Monte TV Ünitesi Kapaklı Raflı MDF", sku: "61370f6a" },
  { name: "Capella 200 cm Ahşap Ayaklı Konsol Raflı 5 Kapaklı MDF", sku: "5155ab94" },
  { name: "Capella 180 cm Ahşap Ayaklı Konsol Raflı 5 Kapaklı MDF", sku: "5c7a8cbf" },
  { name: "Capella 160 cm Ahşap Ayaklı Konsol Raflı 4 Kapaklı MDF", sku: "0c00928c" },
  { name: "Capella 140 cm Ahşap Ayaklı Konsol Raflı 4 Kapaklı MDF", sku: "e5d89d0b" },
  { name: "Capella 120 cm Ahşap Ayaklı Konsol Raflı 3 Kapaklı MDF", sku: "c9512d97" },
  { name: "Capella 200 cm Duvara Monte TV Ünitesi 5 Kapaklı MDF", sku: "1cb9dad9" },
  { name: "Capella 200 cm Ahşap Ayaklı TV Ünitesi 5 Kapaklı MDF", sku: "7e2be4f9" },
  { name: "Capella TV Ünitesi 180 cm 4 Kapaklı Duvara Monte MDF", sku: "3630f726" },
  { name: "Capella 180 cm TV Ünitesi 4 Kapaklı Ayaklı MDF", sku: "e1242c27" },
  { name: "Capella TV Ünitesi 160 cm 4 Kapaklı Duvara Monte MDF", sku: "6f9f8bd4" },
  { name: "Capella TV Ünitesi 160 cm 4 Kapaklı Ayaklı MDF", sku: "8a3aedcc" },
  { name: "Capella TV Ünitesi 140 cm 3 Kapaklı Duvara Monte MDF", sku: "7d01c4df" },
  { name: "Capella TV Ünitesi 140 cm 3 Kapaklı Ayaklı MDF", sku: "9380997b" },
  { name: "Capella MDF Çok Amaçlı Kiler-Mutfak Dolabı", sku: "ee64a3ef" },
  { name: "Capella MDF Çok Amaçlı Banyo Dolabı", sku: "95ee77c7" },
  { name: "Capella TV Ünitesi 240 cm 6 Kapaklı Duvara Monte MDF", sku: "438bd0a7" },
  { name: "Capella TV Ünitesi 240 cm 6 Kapaklı Ayaklı MDF", sku: "70c8ec44" },
  { name: "Avior Kahve Köşesi MDF Kapaklı Raflı 90 cm", sku: "0beb8ca3" },
  { name: "Avior 120 cm Kahve Köşesi MDF Kapaklı ve Raflı", sku: "efe6990b" },
  { name: "TV Ünitesi Ahşap Ayak 19 cm Siyah", sku: "833b03a8" },
  { name: "TV Ünitesi Ahşap Ayak 19 cm Kum Taşı Rengi", sku: "60ae9d2e" },
  { name: "TV Ünitesi Ahşap Ayak 19 cm Doğal Boyasız", sku: "e1806983" },
  { name: "Mimosa 90 cm Duvara Monte Dresuar Kapaklı MDF", sku: "36f153dd" },
  { name: "Mimosa 70 cm Duvara Monte Dresuar Kapaklı MDF", sku: "5cc19c37" },
  { name: "Mimosa 50 cm Duvara Monte Dresuar Kapaklı MDF", sku: "b11acd5c" },
  { name: "Canopus Ahşap Ayaklı Komodin MDF Tek Kapaklı", sku: "06464ed2" },
];

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[çğıöşüİ]/g, (c) => TR_MAP[c] ?? c)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TYPE_WORDS = ["tv unitesi", "konsol", "dolap", "kahve kosesi", "dresuar", "komodin", "ayakkabilik"];

function tokenScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  let score = 0;

  const numsA: string[] = na.match(/\d+/g) ?? [];
  const numsB: string[] = nb.match(/\d+/g) ?? [];
  for (const n of numsA) if (numsB.includes(n)) score += 2;

  for (const w of TYPE_WORDS) {
    if (na.includes(w) && nb.includes(w)) score += 3;
  }
  if ((na.includes("ayakli") && nb.includes("ayakli")) || (na.includes("duvara monte") && nb.includes("duvara monte"))) {
    score += 2;
  }

  const wordsA = new Set(na.split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 3));
  for (const w of wordsA) if (wordsB.has(w)) score += 1;

  return score;
}

async function main() {
  const products = await prisma.product.findMany({
    where: { storeId: "enwood", externalRef: null },
  });
  console.log(`${products.length} eşleştirilecek ürün bulundu.\n`);

  const results: { id: string; trendyolTitle: string; bestName: string; bestSku: string; score: number }[] = [];

  for (const p of products) {
    const info = await fetchProductInfo(p.trendyolUrl);
    const title = info.name ?? "";
    let best = { name: "", sku: "", score: -1 };
    for (const entry of ENWOOD_CATALOG) {
      const s = tokenScore(title, entry.name);
      if (s > best.score) best = { name: entry.name, sku: entry.sku, score: s };
    }
    results.push({ id: p.id, trendyolTitle: title, bestName: best.name, bestSku: best.sku, score: best.score });
    console.log(`[${best.score}] "${title}" -> "${best.name}" (${best.sku})`);
  }

  console.log("\n--- Özet ---");
  const strong = results.filter((r) => r.score >= 6);
  const weak = results.filter((r) => r.score < 6);
  console.log(`Güçlü eşleşme (>=6): ${strong.length}`);
  console.log(`Zayıf/şüpheli eşleşme (<6): ${weak.length}`);
  if (weak.length) {
    console.log("Şüpheli olanlar:");
    for (const w of weak) console.log(`  [${w.score}] "${w.trendyolTitle}" -> "${w.bestName}" (${w.bestSku})`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
