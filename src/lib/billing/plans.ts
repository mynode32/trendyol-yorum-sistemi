export const ACCOUNT_PLANS = ["LEGACY", "STARTER", "PRO"] as const;

export type AccountPlan = (typeof ACCOUNT_PLANS)[number];

export type PlanDefinition = {
  label: string;
  maxProducts: number | null;
};

// Fiyatlandırma ve ödeme bu katalogdan ayrı tutulur. Buradaki tek iş kuralı,
// hangi planın kaç takip ürünü ekleyebileceğidir.
export const PLAN_DEFINITIONS: Record<AccountPlan, PlanDefinition> = {
  LEGACY: { label: "Mevcut müşteri", maxProducts: null },
  STARTER: { label: "Başlangıç", maxProducts: 10 },
  PRO: { label: "Pro", maxProducts: 50 },
};

export function canAddProduct(plan: AccountPlan, currentProductCount: number): boolean {
  const { maxProducts } = PLAN_DEFINITIONS[plan];
  return maxProducts === null || currentProductCount < maxProducts;
}
