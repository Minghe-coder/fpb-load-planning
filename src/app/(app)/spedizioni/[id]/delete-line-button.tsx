"use client"

import { useState, useTransition } from "react"
import { deleteShipmentLine } from "@/lib/actions/shipment"
import { Trash2 } from "lucide-react"

export function DeleteLineButton({
  lineId,
  shipmentId,
}: {
  lineId: string
  shipmentId: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function executeDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteShipmentLine(lineId, shipmentId)
      if (res?.error) {
        setError(res.error)
        setConfirming(false)
      }
    })
  }

  if (error) {
    return (
      <span className="text-xs text-red-600">{error}</span>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={executeDelete}
          disabled={isPending}
          className="inline-flex items-center rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
        >
          {isPending ? "…" : "Sì"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={isPending}
      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 disabled:opacity-40 transition-colors"
      title="Elimina riga"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Elimina
    </button>
  )
}
