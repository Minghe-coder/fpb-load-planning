"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { upsertPhysicalData } from "@/lib/actions/product"
import { CheckCircle2, AlertCircle, Calculator } from "lucide-react"

interface Props {
  productId: string
  existing?: {
    grossWeightKg: number
    lengthCm: number
    widthCm: number
    heightCm: number
    cartonsPerLayer?: number
    layersPerPallet?: number
  }
}

export function PhysicalForm({ productId, existing }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [grossWeightKg, setGrossWeightKg] = useState(existing?.grossWeightKg?.toString() ?? "")
  const [lengthCm, setLengthCm] = useState(existing?.lengthCm?.toString() ?? "")
  const [widthCm, setWidthCm] = useState(existing?.widthCm?.toString() ?? "")
  const [heightCm, setHeightCm] = useState(existing?.heightCm?.toString() ?? "")
  const [cartonsPerLayer, setCartonsPerLayer] = useState(existing?.cartonsPerLayer?.toString() ?? "")
  const [layersPerPallet, setLayersPerPallet] = useState(existing?.layersPerPallet?.toString() ?? "")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Live density preview
  const w = parseFloat(grossWeightKg)
  const l = parseFloat(lengthCm)
  const wd = parseFloat(widthCm)
  const h = parseFloat(heightCm)
  const volumeM3 = (l * wd * h) / 1_000_000
  const density = w > 0 && volumeM3 > 0 ? w / volumeM3 : null

  const densityLabel =
    density === null
      ? null
      : density > 300
      ? "prodotto denso — stacking: base"
      : density > 150
      ? "densità media"
      : "prodotto leggero — stacking: cima"

  const densityColor =
    density === null
      ? ""
      : density > 300
      ? "text-indigo-700 bg-indigo-50"
      : density > 150
      ? "text-amber-700 bg-amber-50"
      : "text-sky-700 bg-sky-50"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const parsed = {
      productId,
      grossWeightKg: parseFloat(grossWeightKg),
      lengthCm: parseFloat(lengthCm),
      widthCm: parseFloat(widthCm),
      heightCm: parseFloat(heightCm),
      cartonsPerLayer: cartonsPerLayer ? parseInt(cartonsPerLayer) : undefined,
      layersPerPallet: layersPerPallet ? parseInt(layersPerPallet) : undefined,
    }

    startTransition(async () => {
      const result = await upsertPhysicalData(parsed)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dimensioni + peso */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Dimensioni e peso per cartone
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Peso lordo (kg)" value={grossWeightKg} onChange={setGrossWeightKg} placeholder="es. 8.5" />
          <Field label="Lunghezza (cm)" value={lengthCm} onChange={setLengthCm} placeholder="es. 60" />
          <Field label="Larghezza (cm)" value={widthCm} onChange={setWidthCm} placeholder="es. 40" />
          <Field label="Altezza (cm)" value={heightCm} onChange={setHeightCm} placeholder="es. 30" />
        </div>
      </div>

      {/* Densità preview */}
      {density !== null && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${densityColor}`}>
          <Calculator className="h-4 w-4 shrink-0" />
          <span>
            Densità: <span className="font-bold">{Math.round(density)} kg/m³</span>
            {densityLabel && <span className="ml-2 font-normal opacity-80">· {densityLabel}</span>}
          </span>
        </div>
      )}

      {/* Config pallet opzionale */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Configurazione pallet <span className="font-normal normal-case text-slate-400">(opzionale)</span>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Cartoni per strato"
            value={cartonsPerLayer}
            onChange={setCartonsPerLayer}
            placeholder="es. 6"
            integer
          />
          <Field
            label="Strati per pallet"
            value={layersPerPallet}
            onChange={setLayersPerPallet}
            placeholder="es. 5"
            integer
          />
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Dati salvati correttamente
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Salvataggio…" : existing ? "Aggiorna dati" : "Salva dati fisici"}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  integer,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  integer?: boolean
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        step={integer ? "1" : "0.01"}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
      />
    </div>
  )
}
