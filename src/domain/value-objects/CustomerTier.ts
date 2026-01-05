export enum CustomerTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export const TierBenefits: Record<CustomerTier, { discountPercent: number; freeShippingThreshold: number }> = {
  [CustomerTier.BRONZE]: { discountPercent: 0, freeShippingThreshold: 1000 },
  [CustomerTier.SILVER]: { discountPercent: 5, freeShippingThreshold: 500 },
  [CustomerTier.GOLD]: { discountPercent: 10, freeShippingThreshold: 0 },
  [CustomerTier.PLATINUM]: { discountPercent: 15, freeShippingThreshold: 0 },
};

export const TierThresholds: Record<CustomerTier, number> = {
  [CustomerTier.BRONZE]: 0,
  [CustomerTier.SILVER]: 1000,
  [CustomerTier.GOLD]: 5000,
  [CustomerTier.PLATINUM]: 20000,
};

export function calculateTierFromPoints(points: number): CustomerTier {
  if (points >= TierThresholds[CustomerTier.PLATINUM]) return CustomerTier.PLATINUM;
  if (points >= TierThresholds[CustomerTier.GOLD]) return CustomerTier.GOLD;
  if (points >= TierThresholds[CustomerTier.SILVER]) return CustomerTier.SILVER;
  return CustomerTier.BRONZE;
}
