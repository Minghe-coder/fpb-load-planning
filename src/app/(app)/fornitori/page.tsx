import { db } from "@/lib/db"
import { SupplierInlineEdit } from "./supplier-inline-edit"
import { Plus, Package } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function FornitoriPage() {
  const suppliers = await db.supplier.findMany({
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Fornitori</h1>
          <p className="mt-1 text-sm text-slate-500">{suppliers.length} fornitori registrati</p>
        </div>
        <Link
          href="/fornitori/nuovo"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuovo fornitore
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Codice</th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Paese</th>
              <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Prodotti attivi</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50 group">
                <td className="px-5 py-3 font-mono text-xs font-bold text-indigo-600 bg-indigo-50/30">
                  {s.code}
                </td>
                <td className="px-5 py-3 font-medium text-slate-900">
                  <SupplierInlineEdit id={s.id} field="name" value={s.name} />
                </td>
                <td className="px-5 py-3 text-slate-500">
                  <SupplierInlineEdit id={s.id} field="country" value={s.country ?? ""} placeholder="—" />
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                    <Package className="h-3 w-3 text-slate-400" />
                    {s._count.products}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/prodotti?supplier=${s.id}`}
                    className="opacity-0 group-hover:opacity-100 text-xs text-indigo-600 hover:underline transition-opacity"
                  >
                    Vedi prodotti
                  </Link>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                  Nessun fornitore. Aggiungine uno per creare prodotti.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
