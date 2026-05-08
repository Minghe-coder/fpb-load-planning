import { getTransportImpact } from "@/lib/queries"
import { fmtEuro, fmtPct, marginBg, foodCategoryColor, foodCategoryLabel, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingDown, Truck, ArrowRight, Download } from "lucide-react"
import Link from "next/link"
import { ShipmentTrendChart } from "@/components/charts/shipment-trend-chart"
import { format } from "date-fns"

export const dynamic = "force-dynamic"

export default async function AnalisiPage() {
  const { products, pricings, importLines, distribLines, overheadRate, shipments } = await getTransportImpact()
  const ratePct = Number(overheadRate?.ratePct ?? 0.2664)

  // ── Aggrega import per prodotto ───────────────────────────────────────────
  const importByProduct = new Map<string, { cost: number; units: number }>()
  for (const l of importLines) {
    const cur = importByProduct.get(l.productId) ?? { cost: 0, units: 0 }
    importByProduct.set(l.productId, { cost: cur.cost + Number(l.allocatedCostEur), units: cur.units + l.quantityUnits })
  }

  // ── Aggrega distribuzione per prodotto+cliente ────────────────────────────
  const distribByCombo = new Map<string, { cost: number; units: number }>()
  for (const l of distribLines) {
    if (!l.customerId) continue
    const key = `${l.productId}::${l.customerId}`
    const cur = distribByCombo.get(key) ?? { cost: 0, units: 0 }
    distribByCombo.set(key, { cost: cur.cost + Number(l.allocatedCostEur), units: cur.units + l.quantityUnits })
  }

  // ── Aggrega distribuzione per cliente (totale) ────────────────────────────
  const distribByCustomer = new Map<string, { cost: number; units: number; name: string; type: string }>()
  for (const l of distribLines) {
    if (!l.customerId) continue
    const pricing = pricings.find((p) => p.customerId === l.customerId)
    if (!pricing) continue
    const cur = distribByCustomer.get(l.customerId) ?? { cost: 0, units: 0, name: pricing.customer.name, type: pricing.customer.type }
    distribByCustomer.set(l.customerId, { ...cur, cost: cur.cost + Number(l.allocatedCostEur), units: cur.units + l.quantityUnits })
  }

  // ── Costruisci righe per-SKU ──────────────────────────────────────────────
  const skuRows = products.map((product) => {
    const productPricings = pricings.filter((p) => p.productId === product.id)
    const avgNnp = productPricings.length
      ? productPricings.reduce((s, p) => s + Number(p.netNetPrice), 0) / productPricings.length
      : 0

    const imp = importByProduct.get(product.id)
    const importPerUnit = imp && imp.units > 0 ? imp.cost / imp.units : 0
    const industrialCost = Number(product.purchasePrice) * (1 + ratePct)
    const fullCost = industrialCost + importPerUnit

    const commercialMargin = avgNnp > 0 ? (avgNnp - industrialCost) / avgNnp : 0
    const realMargin = avgNnp > 0 ? (avgNnp - fullCost) / avgNnp : 0
    const delta = realMargin - commercialMargin
    const transportImpactPct = avgNnp > 0 ? importPerUnit / avgNnp : 0

    return {
      product,
      avgNnp,
      industrialCost,
      importPerUnit,
      fullCost,
      commercialMargin,
      realMargin,
      delta,
      transportImpactPct,
      hasData: importPerUnit > 0,
    }
  }).sort((a, b) => a.delta - b.delta) // peggiori prima

  // ── Costruisci righe per-cliente ──────────────────────────────────────────
  const customerRows = Array.from(distribByCustomer.entries()).map(([customerId, d]) => {
    const customerPricings = pricings.filter((p) => p.customerId === customerId)
    const avgNnp = customerPricings.length
      ? customerPricings.reduce((s, p) => s + Number(p.netNetPrice), 0) / customerPricings.length
      : 0
    const avgDistribPerUnit = d.units > 0 ? d.cost / d.units : 0
    const avgImportPerUnit = customerPricings.length
      ? customerPricings.reduce((s, p) => {
          const imp = importByProduct.get(p.productId)
          return s + (imp && imp.units > 0 ? imp.cost / imp.units : 0)
        }, 0) / customerPricings.length
      : 0
    const avgIndustrialCost = customerPricings.length
      ? customerPricings.reduce((s, p) => s + Number(p.product.purchasePrice) * (1 + ratePct), 0) / customerPricings.length
      : 0

    const fullCostAvg = avgIndustrialCost + avgImportPerUnit + avgDistribPerUnit
    const realMargin = avgNnp > 0 ? (avgNnp - fullCostAvg) / avgNnp : 0
    const commercialMargin = avgNnp > 0 ? (avgNnp - avgIndustrialCost) / avgNnp : 0

    return {
      customerId,
      name: d.name,
      type: d.type,
      skuCount: customerPricings.length,
      totalDistribCost: d.cost,
      avgDistribPerUnit,
      commercialMargin,
      realMargin,
      delta: realMargin - commercialMargin,
    }
  }).sort((a, b) => a.delta - b.delta)

  const hasAnyData = importLines.length > 0 || distribLines.length > 0

  // ── Trend mensile spedizioni ──────────────────────────────────────────────
  const monthlyMap = new Map<string, { import: number; distribuzione: number }>()
  for (const s of shipments) {
    const key = format(new Date(s.shipmentDate), "MMM yy")
    const cur = monthlyMap.get(key) ?? { import: 0, distribuzione: 0 }
    if (s.legType === "IMPORT") {
      monthlyMap.set(key, { ...cur, import: cur.import + Number(s.totalCostEur) })
    } else {
      monthlyMap.set(key, { ...cur, distribuzione: cur.distribuzione + Number(s.totalCostEur) })
    }
  }
  const trendData = Array.from(monthlyMap.entries()).map(([month, v]) => ({ month, ...v }))

  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-100 shrink-0">
          <BarChart3 className="h-5 w-5 text-indigo-700" strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Analisi impatto trasporti</h1>
          <p className="mt-1 text-sm text-slate-500">
            Margine reale per SKU e per cliente dopo la logistica.{" "}
            {!hasAnyData && <span className="text-amber-600 font-medium">I dati si popolano man mano che inserisci spedizioni.</span>}
          </p>
        </div>
        <a
          href="/api/export/analisi"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
        >
          <Download className="h-4 w-4" /> Esporta Excel
        </a>
      </div>

      {/* ── Trend mensile ── */}
      {trendData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Costi trasporto nel tempo</h2>
              <p className="text-xs text-slate-500 mt-0.5">Mensile — import (viola) vs distribuzione (azzurro)</p>
            </div>
          </div>
          <div className="p-6">
            <ShipmentTrendChart data={trendData} />
          </div>
        </div>
      )}

      {/* ── Per SKU ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Truck className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          <h2 className="text-base font-semibold text-slate-800">Impatto trasporto import per SKU</h2>
          <span className="text-xs text-slate-400 ml-1">· ordinati per erosione margine (peggiori prima)</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">SKU / Prodotto</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Categoria</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">NNP medio</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Costo ind.</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Import/pz</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">% NNP</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Marg. comm.</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Marg. reale</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {skuRows.map((row) => (
                <tr key={row.product.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <Link href={`/prodotti/${row.product.id}`} className="font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                      {row.product.name}
                    </Link>
                    <p className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 rounded inline-block ml-1.5">
                      {row.product.sku}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={foodCategoryColor(row.product.foodCategory)}>
                      {foodCategoryLabel(row.product.foodCategory)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right tabular text-slate-700">
                    {row.avgNnp > 0 ? fmtEuro(row.avgNnp) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular text-slate-500">{fmtEuro(row.industrialCost)}</td>
                  <td className="px-5 py-3 text-right tabular font-medium text-slate-700">
                    {row.importPerUnit > 0 ? fmtEuro(row.importPerUnit) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular text-slate-500">
                    {row.transportImpactPct > 0 ? (
                      <span className={row.transportImpactPct > 0.08 ? "text-red-600 font-semibold" : "text-amber-600"}>
                        {fmtPct(row.transportImpactPct)}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.avgNnp > 0 ? <Badge className={marginBg(row.commercialMargin)}>{fmtPct(row.commercialMargin)}</Badge> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.hasData && row.avgNnp > 0 ? (
                      <Badge className={marginBg(row.realMargin)}>{fmtPct(row.realMargin)}</Badge>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className={cn(
                    "px-5 py-3 text-right tabular text-xs font-bold",
                    !row.hasData || row.avgNnp === 0 ? "text-slate-300" :
                    row.delta < -0.05 ? "text-red-600" :
                    row.delta < -0.02 ? "text-amber-600" :
                    "text-emerald-600"
                  )}>
                    {row.hasData && row.avgNnp > 0 ? fmtPct(row.delta) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Per Cliente ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          <h2 className="text-base font-semibold text-slate-800">Impatto distribuzione per cliente</h2>
          <span className="text-xs text-slate-400 ml-1">· ordinati per erosione margine (peggiori prima)</span>
        </div>
        {customerRows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 text-center">
            <TrendingDown className="h-8 w-8 text-slate-200 mx-auto mb-2" strokeWidth={1} />
            <p className="text-sm text-slate-400">Nessuna spedizione di distribuzione ancora registrata.</p>
            <p className="text-xs text-slate-300 mt-1">Inserisci una spedizione di tipo "Distribuzione" per vedere l'impatto per cliente.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-5 py-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">SKU</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Costo distrib. tot.</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Avg distrib/pz</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Marg. comm.</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Marg. reale</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Δ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customerRows.map((row) => (
                  <tr key={row.customerId} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-5 py-3">
                      <Badge className={row.type === "GDO" ? "bg-indigo-50 text-indigo-700 ring-indigo-200" : "bg-slate-100 text-slate-600 ring-slate-200"}>
                        {row.type}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-center tabular text-slate-500">{row.skuCount}</td>
                    <td className="px-5 py-3 text-right tabular font-semibold text-slate-800">{fmtEuro(row.totalDistribCost)}</td>
                    <td className="px-5 py-3 text-right tabular text-slate-600">{fmtEuro(row.avgDistribPerUnit)}</td>
                    <td className="px-5 py-3 text-right">
                      <Badge className={marginBg(row.commercialMargin)}>{fmtPct(row.commercialMargin)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge className={marginBg(row.realMargin)}>{fmtPct(row.realMargin)}</Badge>
                    </td>
                    <td className={cn(
                      "px-5 py-3 text-right tabular text-xs font-bold",
                      row.delta < -0.05 ? "text-red-600" : row.delta < -0.02 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {fmtPct(row.delta)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/clienti/${row.customerId}`} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
                        Dettaglio <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
