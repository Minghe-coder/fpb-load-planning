import Link from "next/link"
import { getOrders } from "@/lib/queries"
import { Plus, Package, Truck, Clock, CheckCircle, AlertCircle, Send } from "lucide-react"

const STATUS_LABEL: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:        { label: "In attesa",       color: "bg-slate-100 text-slate-600",   icon: <Clock className="h-3 w-3" /> },
  IN_PREPARATION: { label: "In preparazione", color: "bg-amber-100 text-amber-700",   icon: <AlertCircle className="h-3 w-3" /> },
  READY:          { label: "Pronto",          color: "bg-green-100 text-green-700",   icon: <CheckCircle className="h-3 w-3" /> },
  SHIPPED:        { label: "Spedito",         color: "bg-blue-100 text-blue-700",     icon: <Send className="h-3 w-3" /> },
}

const TYPE_LABEL: Record<string, string> = {
  INCOMING: "Entrata",
  OUTGOING: "Uscita",
}

export default async function OrdiniPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>
}) {
  const sp = await searchParams
  const orders = await getOrders({ status: sp.status, type: sp.type, q: sp.q })

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    inPrep: orders.filter((o) => o.status === "IN_PREPARATION").length,
    ready: orders.filter((o) => o.status === "READY").length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ordini</h1>
          <p className="text-sm text-slate-500 mt-1">{counts.all} ordini trovati</p>
        </div>
        <Link
          href="/ordini/nuovo"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuovo ordine
        </Link>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "Tutti", value: undefined, count: counts.all },
          { label: "In attesa", value: "PENDING", count: counts.pending },
          { label: "In preparazione", value: "IN_PREPARATION", count: counts.inPrep },
          { label: "Pronti", value: "READY", count: counts.ready },
        ].map(({ label, value, count }) => {
          const active = sp.status === value || (!sp.status && !value)
          const href = value ? `?status=${value}${sp.type ? `&type=${sp.type}` : ""}` : `?${sp.type ? `type=${sp.type}` : ""}`
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-white/20" : "bg-slate-200"}`}>
                {count}
              </span>
            </Link>
          )
        })}

        <div className="ml-auto flex gap-2">
          {["INCOMING", "OUTGOING"].map((t) => {
            const active = sp.type === t
            const href = active
              ? `?${sp.status ? `status=${sp.status}` : ""}`
              : `?type=${t}${sp.status ? `&status=${sp.status}` : ""}`
            return (
              <Link
                key={t}
                href={href}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t === "INCOMING" ? <Package className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                {TYPE_LABEL[t]}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nessun ordine trovato</p>
          <Link href="/ordini/nuovo" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
            Crea il primo ordine
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">N° Ordine</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Cliente / Fornitore</th>
                <th className="px-4 py-3 text-left">Stato</th>
                <th className="px-4 py-3 text-center">Righe</th>
                <th className="px-4 py-3 text-left">Data richiesta</th>
                <th className="px-4 py-3 text-left">Creato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => {
                const st = STATUS_LABEL[o.status] ?? STATUS_LABEL.PENDING
                const counterpart = o.customer?.name ?? o.supplier?.name ?? "—"
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/ordini/${o.id}`} className="font-semibold text-indigo-600 hover:underline">
                        {o.orderNumber ?? `#${o.id.slice(-6).toUpperCase()}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        {o.type === "INCOMING" ? <Package className="h-3.5 w-3.5 text-slate-400" /> : <Truck className="h-3.5 w-3.5 text-slate-400" />}
                        {TYPE_LABEL[o.type] ?? o.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{counterpart}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                        {st.icon}
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{o._count.lines}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {o.requestedDate ? new Date(o.requestedDate).toLocaleDateString("it-IT") : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
