"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export interface PhysicalDataInput {
  productId: string
  grossWeightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  cartonsPerLayer?: number
  layersPerPallet?: number
}

export async function upsertPhysicalData(
  input: PhysicalDataInput
): Promise<{ error?: string; success?: boolean }> {
  const { productId, ...data } = input

  if (data.grossWeightKg <= 0) return { error: "Peso deve essere > 0" }
  if (data.lengthCm <= 0 || data.widthCm <= 0 || data.heightCm <= 0)
    return { error: "Dimensioni devono essere > 0" }

  await db.productPhysical.upsert({
    where: { productId },
    update: {
      grossWeightKg: String(data.grossWeightKg),
      lengthCm: String(data.lengthCm),
      widthCm: String(data.widthCm),
      heightCm: String(data.heightCm),
      cartonsPerLayer: data.cartonsPerLayer ?? null,
      layersPerPallet: data.layersPerPallet ?? null,
    },
    create: {
      productId,
      grossWeightKg: String(data.grossWeightKg),
      lengthCm: String(data.lengthCm),
      widthCm: String(data.widthCm),
      heightCm: String(data.heightCm),
      cartonsPerLayer: data.cartonsPerLayer ?? null,
      layersPerPallet: data.layersPerPallet ?? null,
    },
  })

  revalidatePath(`/prodotti/${productId}`)
  revalidatePath("/prodotti")
  revalidatePath("/dashboard")
  return { success: true }
}

export interface ProductUpdateInput {
  id: string
  name?: string
  purchasePrice?: number
  marketingCredit?: number
  unitsPerCarton?: number
  foodCategory?: string
  fragilityClass?: number
  supplierId?: string
  notes?: string
}

export async function updateProduct(
  input: ProductUpdateInput
): Promise<{ error?: string; success?: boolean }> {
  const { id, ...data } = input

  if (data.purchasePrice !== undefined) {
    const current = await db.product.findUnique({
      where: { id },
      select: { purchasePrice: true },
    })
    if (current && Number(current.purchasePrice) !== data.purchasePrice) {
      await db.productPriceHistory.create({
        data: {
          productId: id,
          oldPrice: String(current.purchasePrice),
          newPrice: String(data.purchasePrice),
        },
      })
    }
  }

  await db.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.purchasePrice !== undefined && { purchasePrice: String(data.purchasePrice) }),
      ...(data.marketingCredit !== undefined && { marketingCredit: String(data.marketingCredit) }),
      ...(data.unitsPerCarton !== undefined && { unitsPerCarton: data.unitsPerCarton }),
      ...(data.foodCategory !== undefined && { foodCategory: data.foodCategory }),
      ...(data.fragilityClass !== undefined && { fragilityClass: data.fragilityClass }),
      ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  })
  revalidatePath(`/prodotti/${id}`)
  revalidatePath("/prodotti")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function deactivateProduct(id: string): Promise<void> {
  await db.product.update({ where: { id }, data: { isActive: false } })
  revalidatePath(`/prodotti/${id}`)
  revalidatePath("/prodotti")
  revalidatePath("/dashboard")
  redirect(`/prodotti/${id}`)
}

export async function reactivateProduct(id: string): Promise<void> {
  await db.product.update({ where: { id }, data: { isActive: true } })
  revalidatePath(`/prodotti/${id}`)
  revalidatePath("/prodotti")
  revalidatePath("/dashboard")
  redirect(`/prodotti/${id}`)
}

export interface CreateProductInput {
  sku: string
  name: string
  supplierId: string
  purchasePrice: number
  unitsPerCarton?: number
  foodCategory?: string
  fragilityClass?: number
  marketingCredit?: number
  notes?: string
}

export async function createProduct(
  input: CreateProductInput
): Promise<{ error?: string; id?: string }> {
  if (!input.sku.trim()) return { error: "SKU obbligatorio" }
  if (!input.name.trim()) return { error: "Nome obbligatorio" }
  if (!input.supplierId) return { error: "Fornitore obbligatorio" }
  if (input.purchasePrice <= 0) return { error: "Prezzo acquisto deve essere > 0" }

  const existing = await db.product.findUnique({ where: { sku: input.sku.trim().toUpperCase() } })
  if (existing) return { error: `SKU ${input.sku.toUpperCase()} già esistente` }

  const product = await db.product.create({
    data: {
      sku: input.sku.trim().toUpperCase(),
      name: input.name.trim(),
      supplierId: input.supplierId,
      purchasePrice: String(input.purchasePrice),
      unitsPerCarton: input.unitsPerCarton ?? null,
      foodCategory: input.foodCategory ?? "DRY",
      fragilityClass: input.fragilityClass ?? 2,
      marketingCredit: String(input.marketingCredit ?? 0),
      notes: input.notes?.trim() || null,
    },
  })

  revalidatePath("/prodotti")
  redirect(`/prodotti/${product.id}`)
}
