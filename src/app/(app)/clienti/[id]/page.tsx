import { getCustomerDetail } from "@/lib/queries"
import { fmtEuro, fmtPct, marginBg, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { notFound } from "next/navigation"
import { ArrowLeft, TrendingDown, Pencil, Archive } from "lucide-react"
import Link from "next/link"
import { CustomerInlineEdit, CustomerTypeSelect, DeactivateCustomerButton } from "./customer-edit"

export const dynamic = "force-dynamic"

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getCustomerDetail(id)
  if (!data?.customer) notFound()

  const { customer, overheadRate, importLines, distribLines } = data
  const ratePct = Number(overheadRate?.ratePct ?? 0.2664)

  // Aggrega costo import per prodotto (media ponderata su tutte le spedizioni)
  const importByProduct = new Map<string, { cost: number; units: number }>()
  for (const l of importLines) {
    const cur = importByProduct.get(l.productId) ?? { cost: 0, units: 0 }
    importByProduct.set(l.productId, {
      cost: cur.cost + Number(l.allocatedCostEur),
      units: cur.units + l.quantityUnits,
    })
  }

  // Aggrega costo distribuzione per prodotto verso questo cliente
  const distribByProduct = new Map<string, { cost: number; units: number }>()
  for (const l of distribLines) {
    const cur = distribByProduct.get(l.productId) ?? { cost: 0, units: 0 }
    distribByProduct.set(l.productId, {
      cost: cur.cost + Number(l.allocatedCostEur),
      units: cur.units + l.quantityUnits,
    })
  }

  const rows = customer.pricing.map((cp) => {
    const nnp = Number(cp.netNetPrice)
    const purchasePrice = Number(cp.product.purchasePrice)
    const industrialCost = purchasePrice * (1 + ratePct)

    const imp = importByProduct.get(cp.productId)
    const dis = distribByProduct.get(cp.productId)
    const importPerUnit = imp && imp.units > 0 ? imp.cost / imp.units : 0
    const distribPerUnit = dis && dis.units > 0 ? dis.cost / dis.units : 0

    const fullCost = industrialCost + importPerUnit + distribPerUnit
    const commercialMargin = nnp > 0 ? (nnp - industrialCost) / nnp : 0
    const realMargin = nnp > 0 ? (nnp - fullCost) / nnp : 0
    const delta = realMargin - commercialMargin

    return { cp, nnp, industrialCost, importPerUnit, distribPerUnit, fullCost, commercialMargin, realMargin, delta }
  })

  // Ordina per delta ASC (quelli più erosi prima)
  rows.sort((a, b) => a.delta - b.delta)

  const hasTransportData = importLines.length > 0 || distribLines.length > 0
  const avgRealMargin = rows.length
    ? rows.reduce((s, r) => s + r.realMargin, 0) / rows.length
    : 0
  const avgCommMargin = rows.length
    ? rows.reduce((s, r) => s + r.commercialMargin, 0) / rows.length
    : 0

  return (
    <div className="flex flex-col gap-6 p-8 max-w-5xl">
      {/* Header */}
      <div>
        <Link
          href="/clienti"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Clienti
        </Link>
        {!customer.isActive && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
            <Archive className="h-3.5 w-3.5" /> Cliente archiviato
          </div>
        )}
        <div className="flex items-start justify-between mt-1">
          <div>
            <CustomerInlineEdit id={customer.id} field="name" value={customer.name} />
            <div className="flex items-center gap-2 mt-1.5">
              <CustomerTypeSelect id={customer.id} value={customer.type} />
              <span className="text-sm text-slate-500">{customer.pricing.length} SKU in listino</span>
            </div>
          </div>
          <DeactivateCustomerButton id={customer.id} name={customer.name} isActive={customer.isActive} />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Margine commerciale medio" value={fmtPct(avgCommMargin)} sub="senza logistica" />
        <KpiCard
          label="Margine reale medio"
          value={hasTransportData ? fmtPct(avgRealMargin) : "—"}
          sub={hasTransportData ? "con import + distribuzione" : "nessuna spedizione ancora"}
          accent={hasTransportData}
        />
        <KpiCard
          label="Erosione logistica"
          value={hasTransportData ? fmtPct(avgRealMargin - avgCommMargin) : "—"}
          sub={hasTransportData ? "Δ margine medio" : ""}
          warning={hasTransportData && avgRealMargin - avgCommMargin < -0.03}
        />
      </div>

      {/* Tabella SKU */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 bg-slate-50/60 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          <span className="font-semibold text-sm text-slate-700">Marginalità per SKU</span>
          {!hasTransportData && (
            <span className="ml-auto text-xs text-slate-400">Margini reali disponibili dopo la prima spedizione</span>
          )}
          <Link
            href={`/listini/nuovo?customerId=${id}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            + Aggiungi prodotto
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Prodotto</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">NNP</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Costo ind.</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Import/pz</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Distrib/pz</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Marg. comm.</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Marg. reale</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Δ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(({ cp, nnp, industrialCost, importPerUnit, distribPerUnit, commercialMargin, realMargin, delta }) => (
              <tr key={cp.id} className="hover:bg-slate-50/50 group">
                <td className="px-5 py-3">
                  <Link href={`/prodotti/${cp.productId}`} className="font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                    {cp.product.name}
                  </Link>
                  <p className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 rounded inline-block ml-1.5">
                    {cp.product.sku}
                  </p>
                </td>
                <td className="px-5 py-3 text-right tabular font-semibold text-slate-900">{fmtEuro(nnp)}</td>
                <td className="px-5 py-3 text-right tabular text-slate-500">{fmtEuro(industrialCost)}</td>
                <td className="px-5 py-3 text-right tabular text-slate-500">
                  {importPerUnit > 0 ? fmtEuro(importPerUnit) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-5 py-3 text-right tabular text-slate-500">
                  {distribPerUnit > 0 ? fmtEuro(distribPerUnit) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  <Badge className={marginBg(commercialMargin)}>{fmtPct(commercialMargin)}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  {(importPerUnit > 0 || distribPerUnit > 0) ? (
                    <Badge className={marginBg(realMargin)}>{fmtPct(realMargin)}</Badge>
                  ) : (
                    <span className="text-[11px] text-slate-300">—</span>
                  )}
                </td>
                <td className={cn(
                  "px-5 py-3 text-right tabular text-xs font-semibold",
                  delta < -0.05 ? "text-red-600" : delta < -0.02 ? "text-amber-600" : "text-slate-400"
                )}>
                  {(importPerUnit > 0 || distribPerUnit > 0) ? fmtPct(delta) : "—"}
                </td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/listini/${cp.id}/edit`}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil className="h-3 w-3" /> Modifica
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, accent, warning }: {
  label: string; value: string; sub?: string; accent?: boolean; warning?: boolean
}) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      warning ? "border-red-200 bg-red-50" : accent ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"
    )}>
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={cn(
        "mt-1 text-2xl font-bold tabular",
        warning ? "text-red-700" : accent ? "text-indigo-700" : "text-slate-900"
      )}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}
