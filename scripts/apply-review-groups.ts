import { prisma } from "../src/lib/db";

const GROUPS: Record<string, string[]> = {
  "capella-tv-unitesi": [
    "438bd0a7", "61370f6a", "6f9f8bd4", "70c8ec44",
    "7e2be4f9", "8a3aedcc", "9380997b", "e1242c27", "f9d10d50",
  ],
  "capella-konsol": ["5155ab94", "5c7a8cbf", "c9512d97"],
  "avior-kahve-kosesi": ["0beb8ca3", "efe6990b"],
  "mimosa-dresuar": ["36f153dd", "b11acd5c"],
};

async function main() {
  for (const [groupId, skus] of Object.entries(GROUPS)) {
    const result = await prisma.product.updateMany({
      where: { externalRef: { in: skus } },
      data: { reviewGroupId: groupId },
    });
    console.log(`${groupId}: ${result.count}/${skus.length} ürün güncellendi`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
