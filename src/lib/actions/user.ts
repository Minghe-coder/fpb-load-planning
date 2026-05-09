"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || role !== "ADMIN") throw new Error("Non autorizzato")
}

export async function createUser(input: {
  name: string
  email: string
  password: string
  role: string
}): Promise<{ error?: string }> {
  await requireAdmin()

  if (!input.email || !input.password || !input.name)
    return { error: "Tutti i campi sono obbligatori" }
  if (input.password.length < 8)
    return { error: "La password deve essere di almeno 8 caratteri" }

  const existing = await db.user.findUnique({ where: { email: input.email } })
  if (existing) return { error: "Email già in uso" }

  const hash = await bcrypt.hash(input.password, 12)
  await db.user.create({
    data: { name: input.name, email: input.email, password: hash, role: input.role },
  })

  revalidatePath("/impostazioni")
  return {}
}

export async function deleteUser(id: string): Promise<{ error?: string }> {
  await requireAdmin()
  const session = await auth()
  if ((session?.user as { id?: string })?.id === id)
    return { error: "Non puoi eliminare il tuo stesso account" }

  await db.user.delete({ where: { id } })
  revalidatePath("/impostazioni")
  return {}
}

export async function changeUserPassword(
  id: string,
  newPassword: string
): Promise<{ error?: string }> {
  await requireAdmin()
  if (newPassword.length < 8) return { error: "Almeno 8 caratteri" }
  const hash = await bcrypt.hash(newPassword, 12)
  await db.user.update({ where: { id }, data: { password: hash } })
  revalidatePath("/impostazioni")
  return {}
}
