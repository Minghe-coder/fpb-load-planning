"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { palletize, PalletizerItem, PalletizationResult } from "@/lib/engine/palletizer"
import { Package, Layers, AlertTriangle, ChevronRight, RotateCcw, ChevronLeft, Box } from "lucide-react"
import { cn } from "@/lib/utils"
import { PrintPalletButton } from "./print-button"

const PalletViewer3D = dynamic(
  () => import("@/components/pallet-viewer-3d").then((m) => m.PalletViewer3D),
  { ssr: false, loading: () => <div className="w-full h-[400px] rounded-xl bg-slate-900 animate-pulse" /> }
)

const PRODUCT_COLORS = [
  "#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6",
]

function buildProductColorMap(pallets: PalletizationResult["pallets"]): Map<string, string> {
  const ids = new Set<string>()
  for (const p of pallets) for (const l of p.layers) ids.add(l.productId)
  const map = new Map<string, string>()
  Array.from(ids).forEach((id, idx) => map.set(id, PRODUCT_COLORS[idx % PRODUCT_COLORS.length]))
  return map
}

interface ProductForPalletizer {
  id: string
  sku: string
  name: string
  foodCategory: string
  fragilityClass: number
  physical: {
    grossWeightKg: number
    lengthCm: number
    widthCm: number
    heightCm: number
  } | null
}

interface Props {
  products: ProductForPalletizer[]
}

type Step = "select" | "results"

interface Selection {
  productId: string
  quantity: string
}

export function PalletizerWizard({ products }: Props) {
  const [step, setStep] = useState<Step>("select")
  const [selections, setSelections] = useState<Map<string, Selection>>(new Map())
  const [result, setResult] = useState<PalletizationResult | null>(null)
  const [engineError, setEngineError] = useState<string | null>(null)

  const withPhysical = products.filter((p) => p.physical !== null)
  const withoutPhysical = products.filter((p) => p.physical === null)

  function toggleProduct(productId: string) {
    setSelections((prev) => {
      const next = new Map(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.set(productId, { productId, quantity: "1" })
      }
      return next
    })
  }

  function setQuantity(productId: string, qty: string) {
    setSelections((prev) => {
      const next = new Map(prev)
      if (next.has(productId)) {
        next.set(productId, { productId, quantity: qty })
      }
      return next
    })
  }

  function calculate() {
    setEngineError(null)
    const items: PalletizerItem[] = []

    for (const [productId, sel] of Array.from(selections.entries())) {
      const product = products.find((p) => p.id === productId)
      if (!product?.physical) continue
      const qty = parseInt(sel.quantity)
      if (!qty || qty <= 0) continue

      items.push({
        productId: product.id,
        productName: product.name,
        totalCartons: qty,
        grossWeightKgPerCarton: product.physical.grossWeightKg,
        lengthCm: product.physical.lengthCm,
        widthCm: product.physical.widthCm,
        heightCm: product.physical.heightCm,
        fragilityClass: product.fragilityClass as 1 | 2 | 3,
        foodCategory: product.foodCategory,
      })
    }

    if (items.length === 0) {
      setEngineError("Seleziona almeno un prodotto con quantità > 0")
      return
    }

    try {
      const res = palletize(items)
      setResult(res)
      setStep("results")
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : "Errore nel calcolo")
    }
  }

  function reset() {
    setStep("select")
    setResult(null)
    setEngineError(null)
  }

  if (step === "results" && result) {
    return <Results result={result} onReset={reset} />
  }

  return (
    <div className="space-y-6">
      {/* Intestazione */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Seleziona prodotti e quantità
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {selections.size > 0 ? `${selections.size} prodotti selezionati` : "Nessun prodotto selezionato"}
          </p>
        </div>
        <button
          onClick={calculate}
          disabled={selections.size === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Calcola pallet <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {engineError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {engineError}
        </div>
      )}

      {/* Lista prodotti con dati fisici */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 bg-slate-50/60">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Prodotti disponibili ({withPhysical.length})
          </span>
        </div>
        <div className="divide-y divide-slate-50">
          {withPhysical.map((product) => {
            const selected = selections.has(product.id)
            const sel = selections.get(product.id)
            const p = product.physical!
            const vol = (p.lengthCm * p.widthCm * p.heightCm) / 1_000_000
            const density = vol > 0 ? Math.round(p.grossWeightKg / vol) : 0

            return (
              <div
                key={product.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 transition-colors",
                  selected ? "bg-indigo-50/50" : "hover:bg-slate-50/50"
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleProduct(product.id)}
                  className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {product.sku}
                    </span>
                    <span className="font-medium text-slate-900 text-sm truncate">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                    <span>{p.lengthCm}×{p.widthCm}×{p.heightCm} cm</span>
                    <span>{p.grossWeightKg} kg/crt</span>
                    <span>{density} kg/m³</span>
                    <FragilityBadge value={product.fragilityClass} />
                  </div>
                </div>
                {selected && (
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-slate-500">Cartoni:</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={sel?.quantity ?? "1"}
                      onChange={(e) => setQuantity(product.id, e.target.value)}
                      className="w-20 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-sm text-center text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Prodotti senza dati fisici */}
      {withoutPhysical.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm font-semibold text-amber-800">
              {withoutPhysical.length} prodotti senza dati fisici (non selezionabili)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {withoutPhysical.map((p) => (
              <span
                key={p.id}
                className="rounded font-mono text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5"
              >
                {p.sku}
              </span>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2">
            Inserisci le dimensioni del cartone nella scheda prodotto per abilitarli.
          </p>
        </div>
      )}
    </div>
  )
}

function Results({ result, onReset }: { result: PalletizationResult; onReset: () => void }) {
  const [activePallet, setActivePallet] = useState(0)
  const [show3D, setShow3D] = useState(true)
  const colorMap = useMemo(() => buildProductColorMap(result.pallets), [result.pallets])
  const pallet = result.pallets[activePallet]

  // Legend: unique products across all pallets
  const legend = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of result.pallets) {
      for (const l of p.layers) {
        if (!seen.has(l.productId)) seen.set(l.productId, l.productName)
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({
      id, name, color: colorMap.get(id) ?? "#6366f1"
    }))
  }, [result.pallets, colorMap])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Risultato: {result.totalPallets} pallet{result.totalPallets !== 1 ? "s" : ""}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Riempimento medio: {result.avgFillByVolumePct.toFixed(1)}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShow3D((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              show3D
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            <Box className="h-3.5 w-3.5" /> Vista 3D
          </button>
          <PrintPalletButton result={result} />
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Ricomincia
          </button>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1.5">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* 3D Viewer */}
      {show3D && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <Box className="h-4 w-4 text-indigo-500" strokeWidth={1.75} />
              <span className="font-semibold text-sm text-slate-700">Visualizzazione 3D</span>
              <span className="text-xs text-slate-400">Trascina per ruotare · Scroll per zoom</span>
            </div>
            {/* Pallet navigation */}
            {result.totalPallets > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePallet((p) => Math.max(0, p - 1))}
                  disabled={activePallet === 0}
                  className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-slate-700 tabular">
                  Pallet {activePallet + 1} / {result.totalPallets}
                </span>
                <button
                  onClick={() => setActivePallet((p) => Math.min(result.totalPallets - 1, p + 1))}
                  disabled={activePallet === result.totalPallets - 1}
                  className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <div className="p-4">
            <PalletViewer3D pallet={pallet} productColorMap={colorMap} />
            {/* Legend */}
            {legend.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {legend.map((item) => (
                  <div key={item.id} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pallet cards */}
      <div className="space-y-4">
        {result.pallets.map((p) => (
          <div key={p.palletNumber} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Pallet header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700">
                  <Package className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <span className="font-semibold text-slate-900">Pallet {p.palletNumber}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <Stat label="Altezza" value={`${p.totalHeightCm} cm`} />
                <Stat label="Peso" value={`${p.totalWeightKg.toFixed(1)} kg`} />
                <Stat label="Riempimento" value={`${p.fillByVolumePct.toFixed(1)}%`} accent />
              </div>
            </div>

            {/* Layer table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Strato</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Prodotto</th>
                  <th className="px-5 py-2.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Cartoni</th>
                  <th className="px-5 py-2.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Griglia</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">H cumulata</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Pos.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {p.layers.map((layer) => (
                  <tr key={layer.layerNumber} className="hover:bg-slate-50/50">
                    <td className="px-5 py-2.5">
                      <span
                        className="inline-block h-3 w-3 rounded-sm mr-1.5 align-middle"
                        style={{ backgroundColor: colorMap.get(layer.productId) ?? "#6366f1" }}
                      />
                      <span className="font-mono text-xs text-slate-500">{layer.layerNumber}</span>
                    </td>
                    <td className="px-5 py-2.5 font-medium text-slate-900">{layer.productName}</td>
                    <td className="px-5 py-2.5 text-center tabular text-slate-600">{layer.cartonsInLayer}</td>
                    <td className="px-5 py-2.5 text-center text-xs text-slate-500">
                      {layer.cartonsAlongLength}×{layer.cartonsAlongWidth}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular text-slate-600">{layer.cumulativeHeightCm} cm</td>
                    <td className="px-5 py-2.5 text-right">
                      <FragilityBadge value={layer.fragilityClass} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Istruzioni di carico */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 bg-slate-50/60">
          <Layers className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          <span className="font-semibold text-sm text-slate-700">Istruzioni di carico</span>
        </div>
        <div className="px-5 py-4">
          <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
            {result.loadingInstructions.join("\n")}
          </pre>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={cn("font-bold tabular", accent ? "text-indigo-600" : "text-slate-800")}>{value}</p>
    </div>
  )
}

function FragilityBadge({ value }: { value: number }) {
  const map: Record<number, { label: string; cls: string }> = {
    1: { label: "base", cls: "bg-slate-100 text-slate-600" },
    2: { label: "centro", cls: "bg-amber-50 text-amber-700" },
    3: { label: "cima", cls: "bg-rose-50 text-rose-700" },
  }
  const { label, cls } = map[value] ?? map[2]
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}
