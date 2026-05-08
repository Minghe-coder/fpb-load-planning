"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export interface OverheadRateInput {
  fiscalYear: number
  ratePct: number
  revenueEur?: number
  totalCostEur?: number
  notes?: string
}

export async function createOverheadRate(
  input: OverheadRateInput
): Promise<{ error?: string; success?: boolean }> {
  if (!input.fiscalYear || input.fiscalYear < 2000 || input.fiscalYear > 2100)
    return { error: "Anno fiscale non valido" }
  if (input.ratePct <= 0 || input.ratePct > 10)
    return { error: "Tasso overhead deve essere tra 0% e 1000%" }

  const existing = await db.overheadRate.findFirst({
    where: { fiscalYear: input.fiscalYear },
  })
  if (existing) return { error: `Anno ${input.fiscalYear} già presente` }

  await db.overheadRate.create({
    data: {
      fiscalYear: input.fiscalYear,
      ratePct: String(input.ratePct),
      revenueEur: input.revenueEur != null ? String(input.revenueEur) : null,
      totalCostEur: input.totalCostEur != null ? String(input.totalCostEur) : null,
      notes: input.notes?.trim() || null,
    },
  })

  revalidatePath("/impostazioni")
  revalidatePath("/dashboard")
  return { success: true }
}
