import { getDashboardStats } from "@/lib/queries"
import { fmtPct, fmtEuro, marginBg, foodCategoryColor, foodCategoryLabel } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { MarginBarChart } from "@/components/charts/margin-bar-chart"
import {
  Package,
  Users,
  Truck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const kpis = [
    {
      label: "Prodotti attivi",
      value: stats.productCount,
      icon: Package,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      note:
        stats.productsWithoutPhysical > 0
          ? `${stats.productsWithoutPhysical} senza dimensioni fisiche`
          : "Tutti completi",
      noteColor: stats.productsWithoutPhysical > 0 ? "text-amber-600" : "text-emerald-600",
    },
    {
      label: "Clienti attivi",
      value: stats.customerCount,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
      note: "Con listino attivo",
      noteColor: "text-slate-500",
    },
    {
      label: stats.avgRealMargin !== null ? "Margine reale medio" : "Margine lordo medio",
      value: fmtPct(stats.avgRealMargin ?? stats.avgMargin),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      note: stats.avgRealMargin !== null
        ? `Comm. ${fmtPct(stats.avgMargin)} → reale con trasporti`
        : `Overhead ${fmtPct(stats.overheadRatePct)} — senza trasporti`,
      noteColor: stats.avgRealMargin !== null ? "text-indigo-600" : "text-slate-500",
    },
    {
      label: "Spedizioni registrate",
      value: stats.shipmentCount,
      icon: Truck,
      color: "text-sky-600",
      bg: "bg-sky-50",
      note: stats.shipmentCount === 0 ? "Inizia inserendo la prima" : "Totale storico",
      noteColor: stats.shipmentCount === 0 ? "text-amber-600" : "text-slate-500",
    },
  ]

  const top10 = stats.productMargins.slice(0, 10)
  const bottom5 = [...stats.productMargins]
    .sort((a, b) => a.avgMargin - b.avgMargin)
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Panoramica margini e attività — dati aggiornati in tempo reale
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">{k.label}</p>
              <div className={`rounded-lg p-1.5 ${k.bg}`}>
                <k.icon className={`h-4 w-4 ${k.color}`} strokeWidth={1.75} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 tabular">{k.value}</p>
            <p className={`mt-1.5 text-xs ${k.noteColor}`}>{k.note}</p>
          </div>
        ))}
      </div>

      {/* Alert prodotti incompleti */}
      {stats.productsWithoutPhysical > 0 && (
        <Link
          href="/prodotti?filter=incompleti"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm hover:bg-amber-100 transition-colors group"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 font-medium">
            {stats.productsWithoutPhysical} prodotti senza dimensioni fisiche
          </span>
          <span className="text-amber-600">
            — il Palletizer e il Cost Allocation Engine richiedono peso e dimensioni per cartone.
          </span>
          <ArrowRight className="ml-auto h-4 w-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Spedizioni vuote */}
      {stats.shipmentCount === 0 && (
        <Link
          href="/spedizioni/new"
          className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3.5 text-sm hover:bg-indigo-100 transition-colors group"
        >
          <Truck className="h-4 w-4 text-indigo-600 shrink-0" />
          <span className="text-indigo-800 font-medium">Nessuna spedizione registrata</span>
          <span className="text-indigo-600">— inizia inserendo un trasporto per calcolare i margini netti reali.</span>
          <ArrowRight className="ml-auto h-4 w-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Grafico margini */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Margine lordo per prodotto
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Media su tutti i clienti — senza costo trasporto
            </p>
          </div>
          <Link
            href="/prodotti"
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            Tutti i prodotti <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="p-6">
          <MarginBarChart data={top10} />
        </div>
      </div>

      {/* Top / Bottom table */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top performers */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Migliori prodotti</h2>
            <p className="text-xs text-slate-500 mt-0.5">Per margine lordo medio</p>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.productMargins.slice(0, 7).map((p, i) => (
              <div key={p.productName} className="flex items-center gap-4 px-6 py-3">
                <span className="w-5 text-xs font-medium text-slate-400 tabular">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.productName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge className={foodCategoryColor(p.foodCategory)}>
                      {foodCategoryLabel(p.foodCategory)}
                    </Badge>
                    <span className="text-[10px] text-slate-400">
                      {p.customerCount} {p.customerCount === 1 ? "cliente" : "clienti"}
                    </span>
                  </div>
                </div>
                <Badge className={marginBg(p.avgMargin)}>
                  {fmtPct(p.avgMargin)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Worst performers */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Da monitorare</h2>
            <p className="text-xs text-slate-500 mt-0.5">Margine lordo più basso — senza trasporto</p>
          </div>
          <div className="divide-y divide-slate-50">
            {bottom5.map((p, i) => (
              <div key={p.productName} className="flex items-center gap-4 px-6 py-3">
                <span className="w-5 text-xs font-medium text-slate-400 tabular">
                  {stats.productMargins.length - i}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.productName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge className={foodCategoryColor(p.foodCategory)}>
                      {foodCategoryLabel(p.foodCategory)}
                    </Badge>
                    {p.minMargin < 0 && (
                      <Badge className="bg-red-50 text-red-700 ring-red-200">In perdita per qualche cliente</Badge>
                    )}
                  </div>
                </div>
                <Badge className={marginBg(p.avgMargin)}>
                  {fmtPct(p.avgMargin)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
