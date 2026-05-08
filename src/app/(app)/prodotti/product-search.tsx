"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { useTransition, useState } from "react"

export function ProductSearch({ initialQ }: { initialQ?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [, startTransition] = useTransition()
  const [value, setValue] = useState(initialQ ?? "")

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setValue(q)
    const next = new URLSearchParams(params.toString())
    if (q) next.set("q", q)
    else next.delete("q")
    startTransition(() => router.replace(`/prodotti?${next.toString()}`))
  }

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Cerca SKU, nome, fornitore…"
        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-all"
      />
    </div>
  )
}
