"use client"

import { useState, useTransition, useOptimistic, useMemo } from "react"
import dynamic from "next/dynamic"
import { markLinePrepared, updateOrderNotes } from "@/lib/actions/order"
import { palletize, EUR_PALLET } from "@/lib/engine/palletizer"
import { buildProductColorMap } from "@/components/pallet-viewer-3d"
import {
  CheckCircle2, Circle, Package, Weight,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight as ChevronRightIcon,
  MessageSquare, Loader2, Layers,
} from "lucide-react"

const PalletViewer3D = dynamic(
  () => import("@/components/pallet-viewer-3d").then((m) => ({ default: m.PalletViewer3D })),
  { ssr: false, loading: () => <div className="h-[360px] rounded-2xl bg-slate-800 animate-pulse" /> }
)

type OrderLine = {
  id: string
  productId: string
  productName: string
  productSku: string
  fragilityClass: 1 | 2 | 3
  foodCategory: string
  quantityOrdered: number
  quantityPrepared: number
  isPrepared: boolean
  lotNumber: string | null
  notes: string | null
  physical: {
    grossWeightKg: number
    lengthCm: number
    widthCm: number
    heightCm: number
  } | null
}

type OrderData = {
  id: string
  orderNumber: string | null
  status: string
  type: string
  counterpart: string | null
  requestedDate: string | null
  notes: string | null
  warehouseNotes: string | null
  lines: OrderLine[]
}

export function WarehouseOrderClient({ order }: { order: OrderData }) {
  const [optimisticLines, updateOptimistic] = useOptimistic(
    order.lines,
    (state: OrderLine[], { lineId, isPrepared }: { lineId: string; isPrepared: boolean }) =>
      state.map((l) => (l.id === lineId ? { ...l, isPrepared } : l))
  )

  const [expandedLine, setExpandedLine] = useState<string | null>(null)
  const [notesText, setNotesText] = useState(order.warehouseNotes ?? "")
  const [showNotes, setShowNotes] = useState(!!order.warehouseNotes)
  const [notesSaved, setNotesSaved] = useState(false)
  const [showPallets, setShowPallets] = useState(false)
  const [currentPallet, setCurrentPallet] = useState(0)
  const [isPending, startTransition] = useTransition()

  const palletItems = useMemo(() =>
    order.lines
      .filter((l) => l.physical)
      .map((l) => ({
        productId: l.productId,
        productName: l.productName,
        totalCartons: l.quantityOrdered,
        grossWeightKgPerCarton: l.physical!.grossWeightKg,
        lengthCm: l.physical!.lengthCm,
        widthCm: l.physical!.widthCm,
        heightCm: l.physical!.heightCm,
        fragilityClass: l.fragilityClass,
        foodCategory: l.foodCategory,
      })),
    [order.lines]
  )

  const pallets = useMemo(() =>
    palletItems.length > 0 ? palletize(palletItems, EUR_PALLET).pallets : [],
    [palletItems]
  )

  const colorMap = useMemo(() => buildProductColorMap(pallets), [pallets])

  const done = optimisticLines.filter((l) => l.isPrepared).length
  const total = optimisticLines.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  function toggleLine(line: OrderLine) {
    const next = !line.isPrepared
    startTransition(async () => {
      updateOptimistic({ lineId: line.id, isPrepared: next })
      await markLinePrepared(line.id, next)
    })
  }

  function saveNotes() {
    startTransition(async () => {
      await updateOrderNotes(order.id, notesText)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className={`rounded-2xl border bg-white p-5 shadow-sm ${pct === 100 ? "border-green-300" : "border-slate-200"}`}>
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-base font-medium text-slate-700">{done} / {total} righe preparate</span>
          <span className={`text-3xl font-black ${pct === 100 ? "text-green-600" : "text-slate-900"}`}>{pct}%</span>
        </div>
        <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : pct > 0 ? "bg-amber-400" : "bg-slate-300"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && (
          <p className="mt-3 text-center text-base font-bold text-green-700">
            ✓ Ordine completamente preparato!
          </p>
        )}
      </div>

      {/* Order notes */}
      {order.notes && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-bold text-amber-800 mb-1">Note ordine:</p>
          <p className="text-sm text-amber-700">{order.notes}</p>
        </div>
      )}

      {/* Lines */}
      <div className="space-y-3">
        {optimisticLines.map((line) => {
          const isExpanded = expandedLine === line.id
          const totalWeight = line.physical
            ? (line.physical.grossWeightKg * line.quantityOrdered).toFixed(1)
            : null

          return (
            <div
              key={line.id}
              className={`rounded-2xl border shadow-sm transition-all ${
                line.isPrepared ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"
              }`}
            >
              {/* Tap to toggle */}
              <button
                type="button"
                onClick={() => toggleLine(line)}
                className="w-full flex items-start gap-4 p-5 text-left active:scale-[0.98] transition-transform"
              >
                <div className="mt-0.5 shrink-0">
                  {line.isPrepared
                    ? <CheckCircle2 className="h-8 w-8 text-green-500" />
                    : <Circle className="h-8 w-8 text-slate-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-lg leading-snug ${line.isPrepared ? "text-green-800 line-through decoration-green-400" : "text-slate-900"}`}>
                    {line.productName}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{line.productSku}</p>

                  <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-base font-bold ${
                      line.isPrepared ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-800"
                    }`}>
                      <Package className="h-4 w-4" />
                      {line.quantityOrdered} cartoni
                    </span>
                    {totalWeight && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-base text-slate-600">
                        <Weight className="h-4 w-4" />
                        {totalWeight} kg
                      </span>
                    )}
                  </div>

                  {line.lotNumber && (
                    <p className="mt-1.5 text-sm text-slate-500 font-mono">Lotto: {line.lotNumber}</p>
                  )}
                </div>
              </button>

              {/* Expand for dimensions */}
              {line.physical && (
                <>
                  <button
                    type="button"
                    onClick={() => setExpandedLine(isExpanded ? null : line.id)}
                    className="w-full flex items-center justify-center gap-1.5 border-t border-slate-100 py-3 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {isExpanded
                      ? <><ChevronUp className="h-4 w-4" /> Nascondi dimensioni</>
                      : <><ChevronDown className="h-4 w-4" /> Dimensioni cartone</>
                    }
                  </button>
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 grid grid-cols-2 gap-3">
                      {[
                        { label: "Lunghezza", value: `${line.physical.lengthCm} cm` },
                        { label: "Larghezza", value: `${line.physical.widthCm} cm` },
                        { label: "Altezza", value: `${line.physical.heightCm} cm` },
                        { label: "Peso/cartone", value: `${line.physical.grossWeightKg} kg` },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                          <p className="text-xs text-slate-400">{label}</p>
                          <p className="text-lg font-bold text-slate-800 mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Pallet 3D */}
      {pallets.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPallets(!showPallets)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              <span className="text-base font-bold text-slate-800">
                Vista pallet
              </span>
              <span className="rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-xs font-bold">
                {pallets.length} {pallets.length === 1 ? "pallet" : "pallet"}
              </span>
            </div>
            {showPallets ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
          </button>

          {showPallets && (
            <div className="border-t border-slate-100 p-4 space-y-4">
              {/* Navigator se > 1 pallet */}
              {pallets.length > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentPallet((p) => Math.max(0, p - 1))}
                    disabled={currentPallet === 0}
                    className="rounded-xl border border-slate-200 p-2.5 disabled:opacity-30 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  <span className="text-base font-semibold text-slate-700">
                    Pallet {currentPallet + 1} di {pallets.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPallet((p) => Math.min(pallets.length - 1, p + 1))}
                    disabled={currentPallet === pallets.length - 1}
                    className="rounded-xl border border-slate-200 p-2.5 disabled:opacity-30 active:scale-95 transition-all"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-slate-600" />
                  </button>
                </div>
              )}

              {/* KPI row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Altezza", value: `${pallets[currentPallet].totalHeightCm.toFixed(0)} cm` },
                  { label: "Peso", value: `${pallets[currentPallet].totalWeightKg.toFixed(0)} kg` },
                  { label: "Strati", value: pallets[currentPallet].layers.length },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Viewer 3D */}
              <PalletViewer3D
                pallet={pallets[currentPallet]}
                productColorMap={colorMap}
              />

              {/* Legenda colori */}
              <div className="flex flex-wrap gap-2">
                {pallets[currentPallet].layers
                  .filter((l, i, arr) => arr.findIndex((x) => x.productId === l.productId) === i)
                  .map((l) => (
                    <div key={l.productId} className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
                      <div
                        className="h-3 w-3 rounded-sm shrink-0"
                        style={{ backgroundColor: colorMap.get(l.productId) ?? "#6366f1" }}
                      />
                      <span className="text-xs text-slate-600 font-medium">{l.productName}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warehouse notes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-2 text-base font-medium text-slate-700"
        >
          <MessageSquare className="h-5 w-5 text-slate-400" />
          Note magazzino
          {showNotes ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {showNotes && (
          <div className="space-y-2">
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={3}
              placeholder="Annotazioni per questo ordine…"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base resize-none focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={saveNotes}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-base font-bold text-white hover:bg-indigo-700 disabled:opacity-60 active:scale-[0.98] transition-all"
            >
              {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : notesSaved ? "✓ Salvato" : "Salva note"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
