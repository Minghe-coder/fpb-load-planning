"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { createShipment } from "@/lib/actions/shipment"
import { allocateTransportCost } from "@/lib/engine/cost-allocation"
import { palletize, PalletizerItem, PalletizationResult } from "@/lib/engine/palletizer"
import { fmtEuro, fmtKg, fmtPct, cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Plus, Trash2, AlertTriangle, CheckCircle2,
  Truck, Package, Loader2, Layers,
  ChevronLeft, ChevronRight, BarChart3, Box, Users,
} from "lucide-react"

const PalletViewer3D = dynamic(
  () => import("@/components/pallet-viewer-3d").then((m) => m.PalletViewer3D),
  { ssr: false, loading: () => <div className="w-full h-[320px] rounded-xl bg-slate-900 animate-pulse" /> }
)

const WAREHOUSE = "FPB"

const PRODUCT_COLORS = [
  "#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6",
]

function buildColorMap(productIds: string[]): Map<string, string> {
  const map = new Map<string, string>()
  Array.from(new Set(productIds)).forEach((id, i) => map.set(id, PRODUCT_COLORS[i % PRODUCT_COLORS.length]))
  return map
}

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface ProductData {
  id: string; sku: string; name: string; unitsPerCarton: number
  hasPhysical: boolean; fragilityClass: number; foodCategory: string
  physical: { grossWeightKg: number; lengthCm: number; widthCm: number; heightCm: number } | null
}
interface CustomerData { id: string; name: string; type: string }
interface LineState { uid: string; productId: string; customerId: string; quantityCartons: string }

const emptyLine = (): LineState => ({
  uid: Math.random().toString(36).slice(2),
  productId: "", customerId: "", quantityCartons: "1",
})

function generateCode(legType: string): string {
  const prefix = legType === "IMPORT" ? "IMP" : "DIS"
  const d = new Date()
  const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, "")
  return `${prefix}-${yyyymmdd}-${Math.floor(Math.random() * 900 + 100)}`
}

// ─── Componente principale ────────────────────────────────────────────────────

export function NewShipmentForm({ products, customers }: { products: ProductData[]; customers: CustomerData[] }) {
  const [legType, setLegType] = useState<"IMPORT" | "DISTRIBUTION">("DISTRIBUTION")
  const [code, setCode] = useState(() => generateCode("DISTRIBUTION"))
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [carrier, setCarrier] = useState("")
  // DISTRIBUTION: routeFrom = FPB (fisso), routeTo = destinazione libera
  // IMPORT:       routeFrom = origine libera, routeTo = FPB (fisso)
  const [freeRoute, setFreeRoute] = useState("")   // il campo libero (cambia lato al cambio tipo)
  const [coeff, setCoeff] = useState("250")
  const [shipmentCustomerId, setShipmentCustomerId] = useState("") // cliente unico (DISTRIBUTION)
  const [isMultiCustomer, setIsMultiCustomer] = useState(false)
  const [lines, setLines] = useState<LineState[]>([emptyLine()])
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [rightTab, setRightTab] = useState<"alloc" | "pallet">("alloc")
  const [activePallet, setActivePallet] = useState(0)
  const [show3D, setShow3D] = useState(false)

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  // Tratta effettiva in base al tipo
  const routeFrom = legType === "DISTRIBUTION" ? WAREHOUSE : freeRoute
  const routeTo   = legType === "IMPORT"        ? WAREHOUSE : freeRoute

  function switchLegType(t: "IMPORT" | "DISTRIBUTION") {
    setLegType(t)
    setCode(generateCode(t))
    setCoeff(t === "IMPORT" ? "167" : "250")
    setFreeRoute("")
    if (t === "IMPORT") {
      setShipmentCustomerId("")
      setIsMultiCustomer(false)
      setLines((ls) => ls.map((l) => ({ ...l, customerId: "" })))
    }
  }

  function addLine() { setLines((ls) => [...ls, emptyLine()]) }
  function removeLine(uid: string) { setLines((ls) => ls.filter((l) => l.uid !== uid)) }
  function updateLine(uid: string, patch: Partial<LineState>) {
    setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l)))
  }

  const [totalCost, setTotalCost] = useState("")

  const validLinesForEngine = useMemo(() =>
    lines.filter((l) => productMap.get(l.productId)?.physical && parseInt(l.quantityCartons) > 0),
    [lines, productMap]
  )
  const allocPreview = useMemo(() => {
    const cost = parseFloat(totalCost)
    if (!cost || cost <= 0 || !validLinesForEngine.length) return null
    try {
      return allocateTransportCost(
        { totalCostEur: cost, volumetricCoefficient: parseFloat(coeff) || 250 },
        validLinesForEngine.map((l) => {
          const p = productMap.get(l.productId)!
          return {
            productId: l.productId,
            customerId: isMultiCustomer ? (l.customerId || null) : (shipmentCustomerId || null),
            quantityCartons: parseInt(l.quantityCartons),
            quantityUnitsPerCarton: p.unitsPerCarton,
            grossWeightKgPerCarton: p.physical!.grossWeightKg,
            lengthCm: p.physical!.lengthCm,
            widthCm: p.physical!.widthCm,
            heightCm: p.physical!.heightCm,
          }
        })
      )
    } catch { return null }
  }, [validLinesForEngine, totalCost, coeff, productMap, isMultiCustomer, shipmentCustomerId])

  // Preview palletizzazione
  const palletPreview = useMemo(() => {
    if (!validLinesForEngine.length) return null
    try {
      return palletize(validLinesForEngine.map((l) => {
        const p = productMap.get(l.productId)!
        return {
          productId: l.productId, productName: p.name,
          totalCartons: parseInt(l.quantityCartons),
          grossWeightKgPerCarton: p.physical!.grossWeightKg,
          lengthCm: p.physical!.lengthCm, widthCm: p.physical!.widthCm, heightCm: p.physical!.heightCm,
          fragilityClass: p.fragilityClass as 1 | 2 | 3, foodCategory: p.foodCategory,
        } satisfies PalletizerItem
      }))
    } catch { return null }
  }, [validLinesForEngine, productMap])

  const safeActivePallet = Math.min(activePallet, Math.max(0, (palletPreview?.totalPallets ?? 1) - 1))
  const colorMap = useMemo(() => {
    if (!palletPreview) return new Map<string, string>()
    return buildColorMap(palletPreview.pallets.flatMap((p) => p.layers.map((l) => l.productId)))
  }, [palletPreview])

  const issues = useMemo(() => {
    const errs: string[] = []
    if (!carrier.trim()) errs.push("Vettore mancante")
    if (!freeRoute.trim()) errs.push(legType === "IMPORT" ? "Origine (porto/fornitore) mancante" : "Destinazione mancante")
    if (!parseFloat(totalCost) || parseFloat(totalCost) <= 0) errs.push("Costo trasporto mancante")
    if (legType === "DISTRIBUTION" && !isMultiCustomer && !shipmentCustomerId)
      errs.push("Cliente destinatario mancante")
    lines.forEach((l, i) => {
      if (!l.productId) errs.push(`Riga ${i + 1}: selezionare un prodotto`)
      else if (!productMap.get(l.productId)?.physical) errs.push(`Riga ${i + 1}: prodotto senza dati fisici`)
      if (legType === "DISTRIBUTION" && isMultiCustomer && !l.customerId)
        errs.push(`Riga ${i + 1}: cliente mancante`)
    })
    return errs
  }, [carrier, freeRoute, totalCost, lines, legType, productMap, shipmentCustomerId, isMultiCustomer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (issues.length || submitting) return
    setSubmitting(true)
    setServerError("")
    const result = await createShipment({
      code, legType, carrier,
      routeFrom,
      routeTo,
      shipmentDate: date,
      totalCostEur: parseFloat(totalCost),
      volumetricCoefficient: parseFloat(coeff) || 250,
      lines: lines.map((l) => ({
        productId: l.productId,
        customerId: isMultiCustomer ? (l.customerId || null) : (legType === "DISTRIBUTION" ? shipmentCustomerId : null),
        quantityCartons: parseInt(l.quantityCartons),
      })),
    })
    if (result?.error) { setServerError(result.error); setSubmitting(false) }
  }

  const productOptions = products.map((p) => ({
    value: p.id, label: `${p.sku} — ${p.name}${p.hasPhysical ? "" : " ⚠"}`,
  }))
  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Toggle tipo */}
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 w-fit gap-1">
        {(["DISTRIBUTION", "IMPORT"] as const).map((t) => (
          <button key={t} type="button" onClick={() => switchLegType(t)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
              legType === t
                ? t === "DISTRIBUTION" ? "bg-sky-500 text-white shadow-sm" : "bg-violet-500 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            <Truck className="h-4 w-4" strokeWidth={1.75} />
            {t === "DISTRIBUTION" ? "Distribuzione" : "Import"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        {/* Colonna sinistra */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Dettagli spedizione</h2>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Codice" value={code} onChange={(e) => setCode(e.target.value)} />
              <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <Input label="Vettore / Corriere" placeholder="es. Schenker, DHL, Fercam…" value={carrier} onChange={(e) => setCarrier(e.target.value)} />

            {/* Tratta semplificata */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-600">Tratta</p>
              <div className="flex items-center gap-2">
                {legType === "DISTRIBUTION" ? (
                  <>
                    <WarehousePill />
                    <span className="text-slate-300 font-bold">→</span>
                    <Input
                      placeholder="Destinazione (es. Milano, cliente…)"
                      value={freeRoute}
                      onChange={(e) => setFreeRoute(e.target.value)}
                      className="flex-1"
                    />
                  </>
                ) : (
                  <>
                    <Input
                      placeholder="Origine (es. Rotterdam, fornitore…)"
                      value={freeRoute}
                      onChange={(e) => setFreeRoute(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-slate-300 font-bold">→</span>
                    <WarehousePill />
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Costo totale trasporto (€)" type="number" min="0" step="0.01" placeholder="0.00" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
              <Input label="Coeff. volumetrico (kg/m³)" type="number" value={coeff} onChange={(e) => setCoeff(e.target.value)} hint="250 = groupage, 333 = FTL, 167 = marittimo" />
            </div>

            {/* Cliente unico — solo in DISTRIBUTION */}
            {legType === "DISTRIBUTION" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-slate-600">Cliente destinatario</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiCustomer((v) => !v)
                      if (!isMultiCustomer) setShipmentCustomerId("") // reset quando si passa a multi
                    }}
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-medium transition-colors rounded px-1.5 py-0.5",
                      isMultiCustomer
                        ? "text-indigo-600 bg-indigo-50"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <Users className="h-3 w-3" />
                    {isMultiCustomer ? "Multi-cliente attivo" : "Multi-cliente"}
                  </button>
                </div>
                {!isMultiCustomer ? (
                  <Select
                    placeholder="Seleziona cliente…"
                    options={customerOptions}
                    value={shipmentCustomerId}
                    onChange={(e) => setShipmentCustomerId(e.target.value)}
                  />
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Cliente selezionabile per ogni singola riga prodotto.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Righe prodotto */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Prodotti</h2>
              <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                <Plus className="h-3.5 w-3.5" /> Aggiungi riga
              </Button>
            </div>
            {lines.map((line) => {
              const prod = productMap.get(line.productId)
              const showCustomerPerLine = legType === "DISTRIBUTION" && isMultiCustomer
              return (
                <div key={line.uid} className={cn(
                  "rounded-lg border p-3 space-y-2 transition-colors",
                  prod && !prod.hasPhysical ? "border-amber-200 bg-amber-50/50" : "border-slate-100 bg-slate-50/50"
                )}>
                  <div className={cn("grid gap-2",
                    showCustomerPerLine ? "grid-cols-[1fr_1fr_80px_32px]" : "grid-cols-[1fr_80px_32px]"
                  )}>
                    <Select placeholder="Seleziona prodotto…" options={productOptions} value={line.productId} onChange={(e) => updateLine(line.uid, { productId: e.target.value })} />
                    {showCustomerPerLine && (
                      <Select placeholder="Cliente…" options={customerOptions} value={line.customerId} onChange={(e) => updateLine(line.uid, { customerId: e.target.value })} />
                    )}
                    <Input type="number" min="1" placeholder="Crt" value={line.quantityCartons} onChange={(e) => updateLine(line.uid, { quantityCartons: e.target.value })} />
                    <button type="button" onClick={() => removeLine(line.uid)} disabled={lines.length === 1}
                      className="flex items-center justify-center h-9 w-8 mt-[22px] rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {prod && !prod.hasPhysical && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Dati fisici mancanti — la riga non sarà inclusa nel calcolo
                    </p>
                  )}
                  {prod?.physical && (
                    <p className="text-[11px] text-slate-400">
                      {prod.physical.grossWeightKg} kg/crt · {prod.physical.lengthCm}×{prod.physical.widthCm}×{prod.physical.heightCm} cm
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Colonna destra — sticky con overflow interno */}
        <div className="sticky top-6 max-h-[calc(100vh-5rem)] overflow-y-auto space-y-4 pr-0.5">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Tab switcher */}
            <div className="flex border-b border-slate-100">
              <button type="button" onClick={() => setRightTab("alloc")}
                className={cn(
                  "flex items-center gap-1.5 flex-1 justify-center py-3 text-xs font-semibold transition-colors",
                  rightTab === "alloc" ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/40" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}>
                <BarChart3 className="h-3.5 w-3.5" /> Allocazione costi
              </button>
              <button type="button" onClick={() => { setRightTab("pallet"); setActivePallet(0) }}
                className={cn(
                  "flex items-center gap-1.5 flex-1 justify-center py-3 text-xs font-semibold transition-colors",
                  rightTab === "pallet" ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/40" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}>
                <Layers className="h-3.5 w-3.5" /> Pallet
                {palletPreview && (
                  <span className="ml-1 rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-bold">
                    {palletPreview.totalPallets}
                  </span>
                )}
              </button>
            </div>

            {/* Tab allocazione */}
            {rightTab === "alloc" && (
              <div className="p-5">
                {!allocPreview ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                    <Package className="h-8 w-8 mb-2" strokeWidth={1} />
                    <p className="text-xs">Inserisci costo e prodotti con dati fisici<br />per vedere l&apos;allocazione</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Peso reale", value: fmtKg(Number(allocPreview.totalRealWeightKg.toFixed(1))) },
                        { label: "Volume", value: Number(allocPreview.totalVolumeM3.toFixed(2)) + " m³" },
                        { label: "Ingombro eff.", value: fmtKg(Number(allocPreview.totalEffectiveWeightKg.toFixed(1))) },
                      ].map((s) => (
                        <div key={s.label} className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                          <p className="text-[10px] text-slate-500">{s.label}</p>
                          <p className="text-sm font-semibold text-slate-900 tabular">{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-slate-100 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Prodotto</th>
                            <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Share</th>
                            <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Totale</th>
                            <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">€/pz</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {allocPreview.lines.map((l) => {
                            const p = productMap.get(l.productId)
                            return (
                              <tr key={l.productId + (l.customerId ?? "")} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2">
                                  <p className="font-medium text-slate-800 truncate max-w-[130px]">{p?.name ?? l.productId}</p>
                                  {l.customerId && (
                                    <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                      {customers.find((c) => c.id === l.customerId)?.name}
                                    </p>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right tabular text-slate-500">{fmtPct(Number(l.effectiveWeightShare.toFixed(4)))}</td>
                                <td className="px-3 py-2 text-right tabular font-medium text-slate-900">{fmtEuro(Number(l.allocatedCostEur.toFixed(2)))}</td>
                                <td className="px-3 py-2 text-right tabular text-slate-700">{fmtEuro(Number(l.allocatedCostPerUnitEur.toFixed(4)), 4)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200 bg-slate-50">
                            <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-slate-600">Totale</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900 tabular">{fmtEuro(parseFloat(totalCost))}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab pallet */}
            {rightTab === "pallet" && (
              !palletPreview ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 p-5">
                  <Layers className="h-8 w-8 mb-2" strokeWidth={1} />
                  <p className="text-xs">Aggiungi prodotti con dati fisici<br />per vedere la composizione dei pallet</p>
                </div>
              ) : (
                <PalletPreview
                  result={palletPreview} activePallet={safeActivePallet}
                  onPrev={() => setActivePallet((p) => Math.max(0, p - 1))}
                  onNext={() => setActivePallet((p) => Math.min(palletPreview.totalPallets - 1, p + 1))}
                  colorMap={colorMap} show3D={show3D} onToggle3D={() => setShow3D((v) => !v)}
                />
              )
            )}
          </div>

          {issues.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Prima di salvare:
              </p>
              {issues.map((issue) => (
                <p key={issue} className="text-xs text-amber-700 pl-5">· {issue}</p>
              ))}
            </div>
          )}

          {serverError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs text-red-700">{serverError}</p>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full justify-center" disabled={issues.length > 0 || submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvataggio…</> : <><CheckCircle2 className="h-4 w-4" /> Salva spedizione</>}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ─── Warehouse pill ───────────────────────────────────────────────────────────

function WarehousePill() {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 shrink-0">
      <span className="text-sm font-bold text-indigo-700">{WAREHOUSE}</span>
    </div>
  )
}

// ─── Pallet preview ───────────────────────────────────────────────────────────

function PalletPreview({
  result, activePallet, onPrev, onNext, colorMap, show3D, onToggle3D,
}: {
  result: PalletizationResult; activePallet: number
  onPrev: () => void; onNext: () => void
  colorMap: Map<string, string>; show3D: boolean; onToggle3D: () => void
}) {
  const pallet = result.pallets[activePallet]

  return (
    <div className="divide-y divide-slate-100">
      {/* Header navigazione */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60">
        <div>
          <span className="text-sm font-semibold text-slate-900">{result.totalPallets} pallet</span>
          <span className="ml-2 text-xs text-slate-400">riempimento medio {result.avgFillByVolumePct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToggle3D}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              show3D ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
            )}>
            <Box className="h-3 w-3" /> 3D
          </button>
          {result.totalPallets > 1 && (
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={onPrev} disabled={activePallet === 0} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 tabular w-16 text-center">
                {activePallet + 1} / {result.totalPallets}
              </span>
              <button type="button" onClick={onNext} disabled={activePallet === result.totalPallets - 1} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="px-5 py-3 bg-amber-50 space-y-1">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-700 flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> {w}
            </p>
          ))}
        </div>
      )}

      {show3D && (
        <div className="p-3">
          <PalletViewer3D pallet={pallet} productColorMap={colorMap} />
          <div className="flex flex-wrap gap-2 mt-2">
            {Array.from(colorMap.entries()).map(([id, color]) => {
              const name = result.pallets.flatMap((p) => p.layers).find((l) => l.productId === id)?.productName ?? id
              return (
                <div key={id} className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-slate-500 truncate max-w-[90px]">{name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 divide-x divide-slate-100">
        {[
          { label: "Altezza", value: `${pallet.totalHeightCm} cm` },
          { label: "Peso", value: `${pallet.totalWeightKg.toFixed(1)} kg` },
          { label: "Riempimento", value: `${pallet.fillByVolumePct.toFixed(1)}%`, accent: true },
        ].map((k) => (
          <div key={k.label} className="px-4 py-3 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{k.label}</p>
            <p className={cn("text-sm font-bold tabular mt-0.5", k.accent ? "text-indigo-600" : "text-slate-900")}>{k.value}</p>
          </div>
        ))}
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/40">
            <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Strato</th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Prodotto</th>
            <th className="px-4 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Crt</th>
            <th className="px-4 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">Griglia</th>
            <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">H cum.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {pallet.layers.map((layer) => (
            <tr key={layer.layerNumber} className="hover:bg-slate-50/50">
              <td className="px-4 py-2">
                <span className="inline-block h-2.5 w-2.5 rounded-sm mr-1 align-middle" style={{ backgroundColor: colorMap.get(layer.productId) ?? "#6366f1" }} />
                <span className="font-mono text-slate-500">{layer.layerNumber}</span>
              </td>
              <td className="px-4 py-2 max-w-[120px]">
                <p className="font-medium text-slate-800 truncate">{layer.productName}</p>
                <FragilityBadge value={layer.fragilityClass} />
              </td>
              <td className="px-4 py-2 text-center tabular text-slate-600">{layer.cartonsInLayer}</td>
              <td className="px-4 py-2 text-center text-slate-500">{layer.cartonsAlongLength}×{layer.cartonsAlongWidth}</td>
              <td className="px-4 py-2 text-right tabular text-slate-600">{layer.cumulativeHeightCm} cm</td>
            </tr>
          ))}
        </tbody>
      </table>

      {!show3D && (
        <div className="px-5 py-3 flex flex-wrap gap-2">
          {Array.from(colorMap.entries()).map(([id, color]) => {
            const name = result.pallets.flatMap((p) => p.layers).find((l) => l.productId === id)?.productName ?? id
            return (
              <div key={id} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-slate-500 truncate max-w-[90px]">{name}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FragilityBadge({ value }: { value: number }) {
  const map: Record<number, { label: string; cls: string }> = {
    1: { label: "base", cls: "bg-slate-100 text-slate-500" },
    2: { label: "centro", cls: "bg-amber-50 text-amber-700" },
    3: { label: "cima", cls: "bg-rose-50 text-rose-700" },
  }
  const { label, cls } = map[value] ?? map[1]
  return <span className={`inline-block rounded px-1 py-0.5 text-[9px] font-semibold ${cls}`}>{label}</span>
}
