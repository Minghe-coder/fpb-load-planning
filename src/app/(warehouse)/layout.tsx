import type { Metadata } from "next"
import Image from "next/image"
import { auth } from "@/lib/auth"
import { WarehouseLogout } from "./logout-button"

export const metadata: Metadata = {
  title: "FPB Magazzino",
  manifest: "/manifest-warehouse.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Magazzino",
  },
}

export default async function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-slate-900 px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl bg-white px-2.5 py-1.5 shadow-sm">
            <Image src="/logo.png" alt="FPB" width={52} height={18} className="object-contain" priority />
          </div>
          <div>
            <p className="text-[13px] font-extrabold text-white leading-none tracking-tight">Load Planning</p>
            <p className="mt-1 text-[9px] font-bold tracking-[0.14em] text-amber-400 uppercase">Magazzino</p>
          </div>
        </div>
        {session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300 hidden sm:block">{session.user.name ?? session.user.email}</span>
            <WarehouseLogout />
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
