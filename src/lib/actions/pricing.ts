"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { calcNNP, type PricingInput } from "@/lib/pricing-utils"

function revalidateAll(productId: string, customerId: string) {
  revalidatePath("/listini")
  revalidatePath(`/prodotti/${productId}`)
  revalidatePath(`/clienti/${customerId}`)
  revalidatePath("/analisi")
  revalidatePath("/dashboard")
}

export async function createPricing(
  input: PricingInput
): Promise<{ error?: string }> {
  if (!input.customerId) return { error: "Cliente obbligatorio" }
  if (!input.productId) return { error: "Prodotto obbligatorio" }
  if (input.grossPrice <= 0) return { error: "Prezzo lordo deve essere > 0" }

  const nnp = calcNNP(input)
  if (nnp <= 0)
    return { error: `NNP risulta ${nnp.toFixed(4)} € — verifica sconti e contributi` }

  // Expire existing active pricing for this customer+product combo
  await db.customerPricing.updateMany({
    where: { customerId: input.customerId, productId: input.productId, validTo: null },
    data: { validTo: new Date() },
  })

  await db.customerPricing.create({
    data: {
      customerId: input.customerId,
      productId: input.productId,
      grossPrice: String(input.grossPrice),
      discount1: String(input.discount1),
      discount2: String(input.discount2),
      discount3: String(input.discount3),
      contractualContribPct: String(input.contractualContribPct),
      promotionalContribPct: String(input.promotionalContribPct),
      promotionalActivitiesPct: String(input.promotionalActivitiesPct),
      listingFeePct: String(input.listingFeePct),
      commissionPct: String(input.commissionPct),
      netNetPrice: String(nnp),
    },
  })

  revalidateAll(input.productId, input.customerId)
  redirect("/listini")
}

export async function expirePricing(id: string): Promise<void> {
  const pricing = await db.customerPricing.findUnique({ where: { id } })
  if (!pricing) return
  await db.customerPricing.update({
    where: { id },
    data: { validTo: new Date() },
  })
  revalidateAll(pricing.productId, pricing.customerId)
}
