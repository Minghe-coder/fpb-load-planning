"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateShipment } from "@/lib/actions/shipment"
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"

interface Props {
  id: string
  initialData: {
    carrier: string
    routeFrom: string
    routeTo: string
    shipmentDate: string
    totalCostEur: number
    volumetricCoefficient: number
    notes: string
  }
  lineCount: number
}

export function ShipmentEditForm({ id, initialData, lineCount }: Props) {
  const [data, setData] = useState(initialData)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const costChanged = data.totalCostEur !== initialData.totalCostEur
  const coeffChanged = data.volumetricCoefficient !== initialData.volumetricCoefficient
  const willReallocate = costChanged || coeffChanged

  function set(field: string, value: string | number) {
    setData((d) => ({ ...d, [field]: value }))
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await updateShipment({
        id,
        carrier: data.carrier,
        routeFrom: data.routeFrom,
        routeTo: data.routeTo,
        shipmentDate: data.shipmentDate,
        totalCostEur: data.totalCostEur,
        volumetricCoefficient: data.volumetricCoefficient,
        notes: data.notes,
      })
      if (res?.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/spedizioni/${id}`)
        }, 800)
      }
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Vettore</label>
          <input
            type="text"
            value={data.carrier}
            onChange={(e) => set("carrier", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Data spedizione</label>
          <input
            type="date"
            value={data.shipmentDate}
            onChange={(e) => set("shipmentDate", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Partenza</label>
          <input
            type="text"
            value={data.routeFrom}
            onChange={(e) => set("routeFrom", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Destinazione</label>
          <input
            type="text"
            value={data.routeTo}
            onChange={(e) => set("routeTo", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Costo totale (€)
            {costChanged && (
              <span className="ml-2 text-amber-600 font-normal">→ ricalcolerà allocazione</span>
            )}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={data.totalCostEur}
            onChange={(e) => set("totalCostEur", parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Coefficiente volumetrico (kg/m³)
            {coeffChanged && (
              <span className="ml-2 text-amber-600 font-normal">→ ricalcolerà allocazione</span>
            )}
          </label>
          <input
            type="number"
            step="1"
            min="100"
            value={data.volumetricCoefficient}
            onChange={(e) => set("volumetricCoefficient", parseFloat(e.target.value) || 250)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Note</label>
        <textarea
          value={data.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
        />
      </div>

      {willReallocate && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          Il costo o il coefficiente è cambiato: il costo allocato verrà ricalcolato proporzionalmente su {lineCount} righe.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Salvato. Reindirizzamento…
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={isPending || success}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {isPending ? "Salvataggio…" : "Salva modifiche"}
        </button>
        <button
          onClick={() => router.push(`/spedizioni/${id}`)}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Annulla
        </button>
      </div>
    </div>
  )
}
