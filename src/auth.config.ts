import type { NextAuthConfig } from "next-auth"

// Config edge-safe: nessun import Node.js (no Prisma, no bcrypt)
// Usato dal middleware che gira nell'Edge Runtime
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [], // i provider reali sono in src/lib/auth.ts
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as { role?: string }).role }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const role = (auth?.user as { role?: string } | undefined)?.role
      const { pathname } = request.nextUrl

      if (pathname === "/login") {
        if (!isLoggedIn) return true
        const dest = role === "WAREHOUSE" ? "/magazzino" : "/dashboard"
        return Response.redirect(new URL(dest, request.nextUrl))
      }

      if (!isLoggedIn) return Response.redirect(new URL("/login", request.nextUrl))

      // Utenti WAREHOUSE: solo /magazzino e sotto-route
      if (role === "WAREHOUSE" && !pathname.startsWith("/magazzino")) {
        return Response.redirect(new URL("/magazzino", request.nextUrl))
      }

      return true
    },
  },
}
