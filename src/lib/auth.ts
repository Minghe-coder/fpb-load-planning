import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { authConfig } from "@/auth.config"
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit"
import { headers } from "next/headers"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 ore
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        // Rate limiting per IP
        const headersList = await headers()
        const ip =
          headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
          headersList.get("x-real-ip") ??
          "unknown"

        const { allowed, retryAfterMs } = checkRateLimit(ip)
        if (!allowed) {
          const minutes = Math.ceil(retryAfterMs / 60000)
          throw new Error(`Troppi tentativi. Riprova tra ${minutes} minuti.`)
        }

        const user = await db.user.findUnique({ where: { email } })
        if (!user) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        // Login riuscito → reset contatore
        resetRateLimit(ip)

        return { id: user.id, email: user.email, name: user.name ?? user.email, role: user.role }
      },
    }),
  ],
})
