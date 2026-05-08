"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard, Truck, Layers, Package,
  Users, Settings, BarChart3, FileText, Building2, LogOut,
} from "lucide-react"

const nav = [
  {
    label: "Principale",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operativo",
    items: [
      { href: "/spedizioni", label: "Spedizioni", icon: Truck },
      { href: "/palletizer", label: "Palletizer", icon: Layers },
      { href: "/analisi", label: "Analisi impatto", icon: BarChart3 },
    ],
  },
  {
    label: "Anagrafica",
    items: [
      { href: "/prodotti", label: "Prodotti", icon: Package },
      { href: "/clienti", label: "Clienti", icon: Users },
      { href: "/fornitori", label: "Fornitori", icon: Building2 },
      { href: "/listini", label: "Listini", icon: FileText },
    ],
  },
]

export function Sidebar() {
  const path = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-w)] flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1.5">
            <Image src="/logo.png" alt="FPB" width={72} height={24} className="object-contain" priority />
          </div>
          <p className="text-[10px] font-medium text-slate-400 leading-tight">
            Load<br />Planning
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
        {nav.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? path === "/dashboard"
                    : path.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      )}
                    >
                      <item.icon
                        className={cn("h-4 w-4 shrink-0", active ? "text-indigo-400" : "text-slate-500")}
                        strokeWidth={1.75}
                      />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 px-3 py-3 space-y-0.5">
        <Link
          href="/impostazioni"
          className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <Settings className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
          Impostazioni
        </Link>

        {/* Utente + logout */}
        {session?.user && (
          <div className="mt-1 rounded-lg bg-slate-800/60 px-2.5 py-2">
            <p className="text-xs font-medium text-slate-300 truncate">{session.user.name ?? session.user.email}</p>
            <p className="text-[10px] text-slate-500 truncate">{session.user.email}</p>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3 w-3" /> Esci
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
