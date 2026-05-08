"use client"

import { expirePricing } from "@/lib/actions/pricing"
import { useState } from "react"
import { ArchiveX } from "lucide-react"

export function ExpireButton({ id, label }: { id: string; label: string }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 transition-colors"
      >
        <ArchiveX className="h-3.5 w-3.5" /> Scade
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1">
      <span className="text-xs text-red-700">{label}?</span>
      <button
        onClick={() => expirePricing(id)}
        className="text-xs font-semibold text-red-600 hover:text-red-700"
      >
        Sì
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        No
      </button>
    </div>
  )
}
