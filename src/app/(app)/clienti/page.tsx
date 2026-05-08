import { getCustomers } from "@/lib/queries"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ArrowRight, Plus, Search, Archive } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ClientiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archivio?: string }>
}) {
  const { q, archivio } = await searchParams
  const customers = await getCustomers(q, { showInactive: !!archivio })

  const typeStyle: Record<string, string> = {
    GDO: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    RETAIL: "bg-slate-100 text-slate-600 ring-slate-200",
    RESTAURANT: "bg-amber-50 text-amber-700 ring-amber-200",
    ETHNIC: "bg-violet-50 text-violet-700 ring-violet-200",
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Clienti</h1>
          <p className="mt-1 text-sm text-slate-500">
            {q
              ? `${customers.length} risultati per "${q}"`
              : archivio
              ? `${customers.length} clienti archiviati`
              : `${customers.length} clienti attivi`}
          </p>
        </div>
        <Link
          href="/clienti/nuovo"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuovo cliente
        </Link>
      </div>

      {/* Search + archive toggle */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <form action="/clienti" method="GET">
            {archivio && <input type="hidden" name="archivio" value="1" />}
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Cerca nome cliente…"
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </form>
        </div>
        <Link
          href={archivio ? "/clienti" : "/clienti?archivio=1"}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            archivio
              ? "border-slate-400 bg-slate-100 text-slate-700"
              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          )}
        >
          <Archive className="h-3.5 w-3.5" />
          {archivio ? "← Attivi" : "Archiviati"}
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU in listino</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/50 group">
                <td className="px-5 py-3">
                  <Link href={`/clienti/${c.id}`} className="font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                    {c.name}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <Badge className={typeStyle[c.type] ?? "bg-slate-100 text-slate-600 ring-slate-200"}>
                    {c.type}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-center tabular text-slate-500">
                  {c._count.pricing}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/clienti/${c.id}`} className="inline-flex items-center gap-1 text-xs text-slate-300 group-hover:text-indigo-500 transition-colors">
                    Dettaglio <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">
                  {q ? `Nessun cliente trovato per "${q}".` : "Nessun cliente attivo."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
