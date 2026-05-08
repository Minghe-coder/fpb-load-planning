"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createSupplier(input: {
  code: string
  name: string
  country?: string
}): Promise<{ error?: string }> {
  const code = input.code.trim().toUpperCase()
  const name = input.name.trim()
  if (!code) return { error: "Codice fornitore obbligatorio" }
  if (!name) return { error: "Nome fornitore obbligatorio" }

  const existing = await db.supplier.findUnique({ where: { code } })
  if (existing) return { error: `Codice "${code}" già utilizzato` }

  await db.supplier.create({
    data: { code, name, country: input.country?.trim() || null },
  })

  revalidatePath("/fornitori")
  redirect("/fornitori")
}

export async function updateSupplier(input: {
  id: string
  name?: string
  country?: string
}): Promise<{ error?: string; success?: boolean }> {
  const { id, ...data } = input
  await db.supplier.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.country !== undefined && { country: data.country?.trim() || null }),
    },
  })
  revalidatePath("/fornitori")
  return { success: true }
}
