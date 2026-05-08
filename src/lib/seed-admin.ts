/**
 * Crea (o aggiorna) l'utente admin iniziale.
 * Eseguire con: npx tsx src/lib/seed-admin.ts
 *
 * Usage:
 *   npx tsx src/lib/seed-admin.ts                        → usa defaults sotto
 *   EMAIL=mario@fpb.it PASSWORD=MiaPassword npx tsx ...  → personalizzato
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

const EMAIL    = process.env.EMAIL    ?? "admin@fpb.it"
const PASSWORD = process.env.PASSWORD ?? "FPB2025!"
const NAME     = process.env.NAME     ?? "Admin FPB"

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12)

  const user = await db.user.upsert({
    where: { email: EMAIL },
    update: { password: hash, name: NAME },
    create: { email: EMAIL, password: hash, name: NAME, role: "ADMIN" },
  })

  console.log(`✅ Utente creato/aggiornato:`)
  console.log(`   Email:    ${user.email}`)
  console.log(`   Password: ${PASSWORD}`)
  console.log(`   Ruolo:    ${user.role}`)
  console.log(`\n⚠️  Cambia la password dopo il primo accesso!`)
}

main()
  .catch((e) => { console.error("❌ Errore:", e); process.exit(1) })
  .finally(() => db.$disconnect())
