"use client"

import { useState, useTransition } from "react"
import { deactivateProduct, reactivateProduct } from "@/lib/actions/product"
import { Trash2, RotateCcw } from "lucide-react"

export function DeactivateProductButton({
  id,
  name,
  isActive,
}: {
  id: string
  name: string
  isActive: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function executeAction() {
    startTransition(async () => {
      if (isActive) {
        await deactivateProduct(id)
      } else {
        await reactivateProduct(id)
      }
    })
  }

  if (!isActive) {
    return (
      <button
        onClick={executeAction}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {isPending ? "…" : "Riattiva prodotto"}
      </button>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600">Disattivare &ldquo;{name}&rdquo;?</span>
        <button
          onClick={executeAction}
          disabled={isPending}
          className="inline-flex items-center rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
        >
          {isPending ? "…" : "Sì, disattiva"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
        >
          Annulla
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Disattiva prodotto
    </button>
  )
}
