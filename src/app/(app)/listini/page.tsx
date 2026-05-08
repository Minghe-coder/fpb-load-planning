import { getPricings, getActiveCustomersForSelect } from "@/lib/queries"
import { fmtEuro, fmtPct, marginBg } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ExpireButton } from "./expire-button"
import { PrintListinoButton } from "./print-listino-button"
import { Plus, Pencil, FileText, Download, Search, History } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ListiniPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; storico?: string; q?: string }>
}) {
  const { customerId, storico, q } = await searchParams
  const showExpired = storico === "1"
  const [{ pricings: allPricings, overheadRate }, customers] = await Promise.all([
    getPricings(customerId, undefined, showExpired),
    getActiveCustomersForSelect(),
  ])

  const pricings = q
    ? allPricings.filter((cp) => {
        const search = q.toLowerCase()
        return (
          cp.customer.name.toLowerCase().includes(search) ||
          cp.product.name.toLowerCase().includes(search) ||
          cp.product.sku.toLowerCase().includes(search)
        )
      })
    : allPricings

  const ratePct = Number(overheadRate?.ratePct ?? 0.2664)

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const all = { customerId, storico, q, ...overrides }
    for (const [k, v] of Object.entries(all)) {
      if (v) params.set(k, v)
    }
    return "/listini" + (params.toString() ? "?" + params.toString() : "")
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Gestione listini</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pricings.length} condizioni commerciali {showExpired ? "totali" : "attive"}
            {q ? ` — ricerca "${q}"` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!showExpired && (
            <PrintListinoButton
              pricings={pricings.map((cp) => ({
                id: cp.id,
                customer: { name: cp.customer.name, type: cp.customer.type },
                product: {
                  name: cp.product.name,
                  sku: cp.product.sku,
                  purchasePrice: cp.product.purchasePrice.toString(),
                },
                grossPrice: cp.grossPrice.toString(),
                discount1: cp.discount1.toString(),
                discount2: cp.discount2.toString(),
                discount3: cp.discount3.toString(),
                contractualContribPct: cp.contractualContribPct.toString(),
                promotionalContribPct: cp.promotionalContribPct.toString(),
                promotionalActivitiesPct: cp.promotionalActivitiesPct.toString(),
                listingFeePct: cp.listingFeePct.toString(),
                commissionPct: cp.commissionPct.toString(),
                netNetPrice: cp.netNetPrice.toString(),
                validFrom: cp.validFrom.toString(),
              }))}
              ratePct={ratePct}
              customerName={customerId ? customers.find((c) => c.id === customerId)?.name : undefined}
            />
          )}
          <a
            href="/api/export/listini"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" /> Excel
          </a>
          <Link
            href="/listini/nuovo"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuovo listino
          </Link>
        </div>
      </div>

      {/* Barra di ricerca + toggle storico */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <form action="/listini" method="GET">
            {customerId && <input type="hidden" name="customerId" value={customerId} />}
            {showExpired && <input type="hidden" name="storico" value="1" />}
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Cerca cliente, prodotto, SKU…"
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </form>
        </div>
        <Link
          href={buildHref({ storico: showExpired ? undefined : "1" })}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            showExpired
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Storico scaduti
        </Link>
      </div>

      {/* Filtro cliente */}
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
        <span className="text-sm text-slate-500">Filtra per cliente:</span>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ customerId: undefined })}
            className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
              !customerId
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            Tutti
          </Link>
          {customers.map((c) => (
            <Link
              key={c.id}
              href={buildHref({ customerId: c.id })}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                customerId === c.id
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Tabella */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Prodotto</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Prezzo lordo</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Sconti (€)</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Contrib. (%)</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">NNP</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Margine</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Da</th>
              {showExpired && (
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Scaduto il</th>
              )}
              {!showExpired && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pricings.map((cp) => {
              const nnp = Number(cp.netNetPrice)
              const industrialCost = Number(cp.product.purchasePrice) * (1 + ratePct)
              const margin = nnp > 0 ? (nnp - industrialCost) / nnp : 0
              const totalDiscounts = Number(cp.discount1) + Number(cp.discount2) + Number(cp.discount3)
              const totalContribs =
                Number(cp.contractualContribPct) +
                Number(cp.promotionalContribPct) +
                Number(cp.promotionalActivitiesPct) +
                Number(cp.listingFeePct) +
                Number(cp.commissionPct)
              const expired = cp.validTo !== null

              return (
                <tr key={cp.id} className={`group ${expired ? "opacity-60" : "hover:bg-slate-50/50"}`}>
                  <td className="px-5 py-3">
                    <Link href={`/clienti/${cp.customerId}`} className="font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                      {cp.customer.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/prodotti/${cp.productId}`} className="text-slate-700 hover:text-indigo-600 transition-colors">
                      {cp.product.name}
                    </Link>
                    <span className="ml-1.5 font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 rounded">
                      {cp.product.sku}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular text-slate-600">{fmtEuro(Number(cp.grossPrice))}</td>
                  <td className="px-5 py-3 text-right tabular text-slate-500">
                    {totalDiscounts > 0 ? fmtEuro(totalDiscounts) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular text-slate-500">
                    {totalContribs > 0 ? fmtPct(totalContribs) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular font-semibold text-slate-900">{fmtEuro(nnp)}</td>
                  <td className="px-5 py-3 text-right">
                    <Badge className={marginBg(margin)}>{fmtPct(margin)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right tabular text-xs text-slate-400">
                    {new Date(cp.validFrom).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  {showExpired ? (
                    <td className="px-5 py-3 text-right tabular text-xs text-slate-400">
                      {cp.validTo
                        ? new Date(cp.validTo).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })
                        : <span className="text-emerald-600 font-medium">Attivo</span>}
                    </td>
                  ) : (
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/listini/${cp.id}/edit`}
                          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Modifica
                        </Link>
                        <ExpireButton
                          id={cp.id}
                          label={`Scadere ${cp.customer.name} / ${cp.product.sku}`}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {pricings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="h-8 w-8 mb-2" strokeWidth={1} />
            <p className="text-sm">
              {q
                ? `Nessun risultato per "${q}".`
                : showExpired
                ? `Nessun listino scaduto${customerId ? " per questo cliente" : ""}.`
                : `Nessun listino attivo${customerId ? " per questo cliente" : ""}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
