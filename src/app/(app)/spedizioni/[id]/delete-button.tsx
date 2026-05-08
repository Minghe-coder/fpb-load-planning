"use client"
import { deleteShipment } from "@/lib/actions/shipment"
import { Trash2 } from "lucide-react"
import { useState } from "react"

export function DeleteShipmentButton({ id, code }: { id: string; code: string }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" /> Elimina
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
      <span className="text-xs text-red-700">Eliminare {code}?</span>
      <button
        onClick={() => deleteShipment(id)}
        className="text-xs font-semibold text-red-600 hover:text-red-700"
      >
        Sì
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        No
      </button>
    </div>
  )
}
