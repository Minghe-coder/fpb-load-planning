"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function WarehouseLogout() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors active:scale-95"
    >
      <LogOut className="h-3.5 w-3.5" />
      Esci
    </button>
  )
}
