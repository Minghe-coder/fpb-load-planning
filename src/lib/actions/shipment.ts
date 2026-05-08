"use server"

import { db } from "@/lib/db"
import { allocateTransportCost } from "@/lib/engine/cost-allocation"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export interface ShipmentLineInput {
  productId: string
  customerId?: string | null
  quantityCartons: number
}

export interface CreateShipmentInput {
  code: string
  legType: "IMPORT" | "DISTRIBUTION"
  carrier: string
  routeFrom: string
  routeTo: string
  shipmentDate: string
  totalCostEur: number
  volumetricCoefficient: number
  lines: ShipmentLineInput[]
}

export async function createShipment(
  input: CreateShipmentInput
): Promise<{ error: string } | void> {
  // Valida campi obbligatori
  if (!input.code.trim()) return { error: "Codice spedizione obbligatorio" }
  if (!input.carrier.trim()) return { error: "Vettore obbligatorio" }
  if (!input.lines.length) return { error: "Aggiungere almeno un prodotto" }
  if (input.totalCostEur <= 0) return { error: "Costo trasporto deve essere > 0" }

  // Verifica codice univoco
  const existing = await db.shipment.findUnique({ where: { code: input.code } })
  if (existing) return { error: `Codice "${input.code}" già utilizzato` }

  // Carica dati fisici prodotti
  const productIds = [...new Set(input.lines.map((l) => l.productId))]
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: { physical: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  // Controlla che tutti i prodotti abbiano dati fisici
  const missingPhysical = input.lines
    .filter((l) => !productMap.get(l.productId)?.physical)
    .map((l) => productMap.get(l.productId)?.name ?? l.productId)

  if (missingPhysical.length) {
    return {
      error: `Prodotti senza dati fisici (peso/dimensioni): ${missingPhysical.join(", ")}. Completare l'anagrafica prima di inserire la spedizione.`,
    }
  }

  // Costruisci input engine
  const engineLines = input.lines.map((line) => {
    const p = productMap.get(line.productId)!
    const ph = p.physical!
    return {
      productId: line.productId,
      customerId: line.customerId ?? null,
      quantityCartons: line.quantityCartons,
      quantityUnitsPerCarton: p.unitsPerCarton ?? 1,
      grossWeightKgPerCarton: Number(ph.grossWeightKg),
      lengthCm: Number(ph.lengthCm),
      widthCm: Number(ph.widthCm),
      heightCm: Number(ph.heightCm),
    }
  })

  // Calcola allocazione
  const result = allocateTransportCost(
    { totalCostEur: input.totalCostEur, volumetricCoefficient: input.volumetricCoefficient },
    engineLines
  )

  // Salva su DB
  const shipment = await db.shipment.create({
    data: {
      code: input.code,
      legType: input.legType,
      carrier: input.carrier,
      routeFrom: input.routeFrom,
      routeTo: input.routeTo,
      shipmentDate: new Date(input.shipmentDate),
      totalCostEur: String(input.totalCostEur),
      volumetricCoefficient: String(input.volumetricCoefficient),
      lines: {
        create: result.lines.map((line) => ({
          productId: line.productId,
          customerId: line.customerId,
          quantityCartons: line.quantityCartons,
          quantityUnits: line.quantityUnits,
          realWeightKg: line.realWeightKg.toFixed(3),
          volumeM3: line.volumeM3.toFixed(5),
          volumetricWeightKg: line.volumetricWeightKg.toFixed(3),
          effectiveWeightKg: line.effectiveWeightKg.toFixed(3),
          allocatedCostEur: line.allocatedCostEur.toFixed(4),
          allocatedCostPerUnitEur: line.allocatedCostPerUnitEur.toFixed(6),
        })),
      },
    },
  })

  revalidatePath("/spedizioni")
  revalidatePath("/dashboard")
  redirect(`/spedizioni/${shipment.id}`)
}

export async function deleteShipment(id: string): Promise<void> {
  await db.shipment.delete({ where: { id } })
  revalidatePath("/spedizioni")
  revalidatePath("/dashboard")
  redirect("/spedizioni")
}

export interface UpdateShipmentInput {
  id: string
  carrier?: string
  routeFrom?: string
  routeTo?: string
  shipmentDate?: string
  totalCostEur?: number
  volumetricCoefficient?: number
  notes?: string
}

export async function updateShipment(
  input: UpdateShipmentInput
): Promise<{ error?: string; success?: boolean }> {
  const { id, totalCostEur, volumetricCoefficient, ...fields } = input

  const shipment = await db.shipment.findUnique({
    where: { id },
    include: { lines: true },
  })
  if (!shipment) return { error: "Spedizione non trovata" }

  const newCost = totalCostEur ?? Number(shipment.totalCostEur)
  const needsReallocation =
    (totalCostEur !== undefined && totalCostEur !== Number(shipment.totalCostEur)) ||
    (volumetricCoefficient !== undefined &&
      volumetricCoefficient !== Number(shipment.volumetricCoefficient))

  await db.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id },
      data: {
        ...(fields.carrier !== undefined && { carrier: fields.carrier }),
        ...(fields.routeFrom !== undefined && { routeFrom: fields.routeFrom }),
        ...(fields.routeTo !== undefined && { routeTo: fields.routeTo }),
        ...(fields.shipmentDate !== undefined && { shipmentDate: new Date(fields.shipmentDate) }),
        ...(fields.notes !== undefined && { notes: fields.notes || null }),
        ...(totalCostEur !== undefined && { totalCostEur: String(totalCostEur) }),
        ...(volumetricCoefficient !== undefined && {
          volumetricCoefficient: String(volumetricCoefficient),
        }),
      },
    })

    if (needsReallocation && shipment.lines.length > 0) {
      const totalEffWeight = shipment.lines.reduce(
        (s, l) => s + Number(l.effectiveWeightKg),
        0
      )
      if (totalEffWeight > 0) {
        for (const line of shipment.lines) {
          const allocatedCostEur =
            (Number(line.effectiveWeightKg) / totalEffWeight) * newCost
          const allocatedCostPerUnitEur = allocatedCostEur / line.quantityUnits
          await tx.shipmentLine.update({
            where: { id: line.id },
            data: {
              allocatedCostEur: allocatedCostEur.toFixed(4),
              allocatedCostPerUnitEur: allocatedCostPerUnitEur.toFixed(6),
            },
          })
        }
      }
    }
  })

  revalidatePath(`/spedizioni/${id}`)
  revalidatePath("/spedizioni")
  revalidatePath("/dashboard")
  revalidatePath("/analisi")
  return { success: true }
}

export async function deleteShipmentLine(
  lineId: string,
  shipmentId: string
): Promise<{ error?: string; success?: boolean }> {
  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    include: { lines: true },
  })
  if (!shipment) return { error: "Spedizione non trovata" }

  if (shipment.lines.length <= 1)
    return { error: "Impossibile eliminare l'unica riga — elimina l'intera spedizione" }

  await db.shipmentLine.delete({ where: { id: lineId } })

  // Re-alloca il costo sulle righe rimanenti
  const remaining = await db.shipmentLine.findMany({ where: { shipmentId } })
  const totalEffWeight = remaining.reduce((s, l) => s + Number(l.effectiveWeightKg), 0)
  const totalCost = Number(shipment.totalCostEur)

  if (totalEffWeight > 0) {
    for (const line of remaining) {
      const allocatedCostEur = (Number(line.effectiveWeightKg) / totalEffWeight) * totalCost
      await db.shipmentLine.update({
        where: { id: line.id },
        data: {
          allocatedCostEur: allocatedCostEur.toFixed(4),
          allocatedCostPerUnitEur: (allocatedCostEur / line.quantityUnits).toFixed(6),
        },
      })
    }
  }

  revalidatePath(`/spedizioni/${shipmentId}`)
  revalidatePath("/analisi")
  revalidatePath("/dashboard")
  return { success: true }
}
