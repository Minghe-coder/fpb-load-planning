import { getProducts } from "@/lib/queries"
import { fmtEuro, foodCategoryColor, foodCategoryLabel, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ProductSearch } from "./product-search"
import { CheckCircle2, AlertCircle, Package, Plus, Download } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; archivio?: string }>
}) {
  const { q, filter, archivio } = await searchParams
  const allProducts = await getProducts({ showInactive: !!archivio })

  const products = allProducts.filter((p) => {
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.sku.toLowerCase().includes(q.toLowerCase()) ||
      p.supplier.name.toLowerCase().includes(q.toLowerCase())
    const matchesFilter =
      filter !== "incompleti" || !p.physical
    return matchesSearch && matchesFilter
  })

  const completi = allProducts.filter((p) => !!p.physical).length
  const incompleti = allProducts.length - completi

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Prodotti</h1>
          <p className="mt-1 text-sm text-slate-500">
            {archivio
              ? `${allProducts.length} prodotti archiviati`
              : `${allProducts.length} SKU attivi · ${completi} completi · `}
            {!archivio && (
              <span className={incompleti > 0 ? "text-amber-600 font-medium" : "text-slate-500"}>
                {incompleti} senza dimensioni fisiche
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export/prodotti"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" /> Excel
          </a>
          <Link
            href="/prodotti/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuovo prodotto
          </Link>
        </div>
      </div>

      {/* Filtri / Ricerca */}
      <div className="flex items-center gap-3">
        <ProductSearch initialQ={q} />
        {!archivio && (
          <Link
            href={filter === "incompleti" ? "/prodotti" : "/prodotti?filter=incompleti"}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              filter === "incompleti"
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Solo incompleti
            {incompleti > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {incompleti}
              </span>
            )}
          </Link>
        )}
        <Link
          href={archivio ? "/prodotti" : "/prodotti?archivio=1"}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            archivio
              ? "border-slate-400 bg-slate-100 text-slate-700"
              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          )}
        >
          <Package className="h-3.5 w-3.5" />
          {archivio ? "← Attivi" : "Archiviati"}
        </Link>
      </div>

      {/* Tabella */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fornitore</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Prezzo acq.</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Pz/Crt</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Clienti</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Fisico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-slate-50/50 transition-colors group"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {p.sku}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/prodotti/${p.id}`}
                    className="font-medium text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.supplier.name}</td>
                <td className="px-4 py-3">
                  <Badge className={foodCategoryColor(p.foodCategory)}>
                    {foodCategoryLabel(p.foodCategory)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right tabular text-slate-700 font-medium">
                  {fmtEuro(Number(p.purchasePrice))}
                </td>
                <td className="px-4 py-3 text-center tabular text-slate-500">
                  {p.unitsPerCarton ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-center tabular text-slate-500">
                  {p._count.customerPricing}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.physical ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      OK
                    </span>
                  ) : (
                    <Link
                      href={`/prodotti/${p.id}#physical`}
                      className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium hover:text-amber-700"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      Da inserire
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Package className="h-8 w-8 mb-2" strokeWidth={1} />
            <p className="text-sm">Nessun prodotto trovato</p>
          </div>
        )}
      </div>
    </div>
  )
}
