import Link from "next/link"
import { Truck, Plus, ArrowRight, Download, Search, SlidersHorizontal } from "lucide-react"
import { getShipments } from "@/lib/queries"
import { fmtEuro, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export const dynamic = "force-dynamic"

export default async function SpedizioniPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; from?: string; to?: string }>
}) {
  const { q, tipo, from, to } = await searchParams
  const shipments = await getShipments({ q, tipo, from, to })

  const hasFilters = !!(tipo || from || to)

  const totalCost = shipments.reduce((s, sh) => s + Number(sh.totalCostEur), 0)

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Spedizioni</h1>
          <p className="mt-1 text-sm text-slate-500">
            {shipments.length} spedizioni
            {q ? ` — ricerca "${q}"` : ""}
            {hasFilters ? " · filtri attivi" : ""}
            {shipments.length > 0 ? ` · ${fmtEuro(totalCost)} totale` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export/spedizioni"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" /> Excel
          </a>
          <Link
            href="/spedizioni/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuova spedizione
          </Link>
        </div>
      </div>

      {/* Barra filtri */}
      <form action="/spedizioni" method="GET" className="flex flex-wrap items-end gap-3">
        {/* Ricerca testo */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Codice, vettore, tratta…"
            className="w-52 rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Tipo */}
        <div className="flex items-center gap-1">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            name="tipo"
            defaultValue={tipo ?? ""}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
          >
            <option value="">Tutti i tipi</option>
            <option value="IMPORT">Import</option>
            <option value="DISTRIBUTION">Distribuzione</option>
          </select>
        </div>

        {/* Da */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500 shrink-0">Dal</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Al */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500 shrink-0">Al</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Filtra
        </button>

        {(q || hasFilters) && (
          <Link
            href="/spedizioni"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Reset
          </Link>
        )}
      </form>

      {shipments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <Truck className="h-10 w-10 text-slate-300 mb-3" strokeWidth={1} />
          <h3 className="text-base font-medium text-slate-700">
            {hasFilters || q ? "Nessun risultato" : "Nessuna spedizione"}
          </h3>
          <p className="mt-1 text-sm text-slate-400 max-w-xs">
            {hasFilters || q
              ? "Prova a modificare i filtri di ricerca."
              : "Registra la prima spedizione per iniziare ad allocare i costi di trasporto."}
          </p>
          {!(hasFilters || q) && (
            <Link
              href="/spedizioni/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Inserisci prima spedizione
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Codice</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tratta</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vettore</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Righe</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shipments.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-indigo-600">{s.code}</td>
                  <td className="px-5 py-3 text-slate-600 tabular">
                    {format(new Date(s.shipmentDate), "dd MMM yyyy", { locale: it })}
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={s.legType === "IMPORT"
                      ? "bg-violet-50 text-violet-700 ring-violet-200"
                      : "bg-sky-50 text-sky-700 ring-sky-200"}>
                      {s.legType === "IMPORT" ? "Import" : "Distribuzione"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">
                    {s.routeFrom} → {s.routeTo}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{s.carrier}</td>
                  <td className="px-5 py-3 text-right tabular font-semibold text-slate-900">
                    {fmtEuro(Number(s.totalCostEur))}
                  </td>
                  <td className="px-5 py-3 text-center text-slate-500">{s._count.lines}</td>
                  <td className="px-5 py-3 text-center">
                    <Link
                      href={`/spedizioni/${s.id}`}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Dettaglio <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Totale a piè di tabella */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex justify-between items-center">
            <span className="text-xs text-slate-500">{shipments.length} spedizioni</span>
            <span className="text-sm font-semibold text-slate-900">{fmtEuro(totalCost)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
