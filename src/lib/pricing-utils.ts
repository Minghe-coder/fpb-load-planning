import Decimal from "decimal.js"

export interface PricingInput {
  customerId: string
  productId: string
  grossPrice: number
  discount1: number
  discount2: number
  discount3: number
  contractualContribPct: number
  promotionalContribPct: number
  promotionalActivitiesPct: number
  listingFeePct: number
  commissionPct: number
}

export function calcNNP(input: Omit<PricingInput, "customerId" | "productId">): number {
  const gross = new Decimal(input.grossPrice)
  const afterDisc = gross
    .minus(input.discount1)
    .minus(input.discount2)
    .minus(input.discount3)
  const totalPct = new Decimal(input.contractualContribPct)
    .plus(input.promotionalContribPct)
    .plus(input.promotionalActivitiesPct)
    .plus(input.listingFeePct)
    .plus(input.commissionPct)
  return afterDisc.times(new Decimal(1).minus(totalPct)).toNumber()
}
