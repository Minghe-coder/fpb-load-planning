"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createCustomer(input: {
  name: string
  type: string
}): Promise<{ error?: string }> {
  if (!input.name.trim()) return { error: "Nome obbligatorio" }

  const existing = await db.customer.findUnique({ where: { name: input.name.trim() } })
  if (existing) return { error: `Cliente "${input.name}" già esistente` }

  await db.customer.create({
    data: { name: input.name.trim(), type: input.type },
  })

  revalidatePath("/clienti")
  revalidatePath("/analisi")
  redirect("/clienti")
}

export async function updateCustomer(input: {
  id: string
  name?: string
  type?: string
}): Promise<{ error?: string; success?: boolean }> {
  const { id, name, type } = input
  if (name !== undefined) {
    const trimmed = name.trim()
    if (!trimmed) return { error: "Nome obbligatorio" }
    const clash = await db.customer.findFirst({
      where: { name: trimmed, NOT: { id } },
    })
    if (clash) return { error: `Nome "${trimmed}" già utilizzato` }
    await db.customer.update({ where: { id }, data: { name: trimmed } })
  }
  if (type !== undefined) {
    await db.customer.update({ where: { id }, data: { type } })
  }
  revalidatePath(`/clienti/${id}`)
  revalidatePath("/clienti")
  return { success: true }
}

export async function deactivateCustomer(id: string): Promise<{ error?: string }> {
  await db.customer.update({ where: { id }, data: { isActive: false } })
  revalidatePath(`/clienti/${id}`)
  revalidatePath("/clienti")
  revalidatePath("/dashboard")
  redirect(`/clienti/${id}`)
}

export async function reactivateCustomer(id: string): Promise<void> {
  await db.customer.update({ where: { id }, data: { isActive: true } })
  revalidatePath(`/clienti/${id}`)
  revalidatePath("/clienti")
  revalidatePath("/dashboard")
  redirect(`/clienti/${id}`)
}
