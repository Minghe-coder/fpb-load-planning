import Link from "next/link"
import { getOrdersForWarehouse } from "@/lib/queries"
import { Package, Clock, AlertCircle, CheckCircle, ChevronRight } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function MagazzinoPage() {
  const orders = await getOrdersForWarehouse()

  const pending = orders.filter((o) => o.status === "PENDING")
  const inPrep = orders.filter((o) => o.status === "IN_PREPARATION")

  return (
    <div className="p-4 pb-8 space-y-6 max-w-2xl mx-auto">
      <div className="pt-2">
        <p className="text-slate-500 text-sm">{orders.length} ordini da preparare</p>
      </div>

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <p className="text-xl font-bold text-slate-700">Tutto pronto!</p>
          <p className="text-slate-400 mt-1">Nessun ordine da preparare</p>
        </div>
      )}

      {inPrep.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <h2 className="font-bold text-slate-800 text-base">In preparazione</h2>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-bold">{inPrep.length}</span>
          </div>
          {inPrep.map((o) => <OrderCard key={o.id} order={o} />)}
        </section>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Clock className="h-5 w-5 text-slate-400" />
            <h2 className="font-bold text-slate-800 text-base">In attesa</h2>
            <span className="rounded-full bg-slate-200 text-slate-600 px-2.5 py-0.5 text-xs font-bold">{pending.length}</span>
          </div>
          {pending.map((o) => <OrderCard key={o.id} order={o} />)}
        </section>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: Awaited<ReturnType<typeof getOrdersForWarehouse>>[number] }) {
  const total = order.lines.length
  const done = order.lines.filter((l) => l.isPrepared).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const counterpart = order.customer?.name ?? order.supplier?.name ?? "—"
  const isComplete = pct === 100

  return (
    <Link
      href={`/magazzino/${order.id}`}
      className={`block rounded-2xl border bg-white p-5 shadow-sm transition-all active:scale-[0.99] ${
        isComplete ? "border-green-200" : "border-slate-200 hover:border-indigo-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-xl">
              {order.orderNumber ?? `#${order.id.slice(-6).toUpperCase()}`}
            </span>
            {isComplete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <CheckCircle className="h-3.5 w-3.5" /> Pronto
              </span>
            )}
          </div>
          <p className="text-slate-600 mt-0.5 text-base truncate">{counterpart}</p>
          {order.requestedDate && (
            <p className="text-xs text-slate-400 mt-0.5">
              Entro: {new Date(order.requestedDate).toLocaleDateString("it-IT")}
            </p>
          )}

          <div className="mt-3">
            <div className="flex justify-between text-sm text-slate-500 mb-1.5">
              <span>{done} / {total} righe completate</span>
              <span className="font-semibold">{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isComplete ? "bg-green-500" : pct > 0 ? "bg-amber-400" : "bg-slate-300"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-3 flex gap-1.5 flex-wrap">
            {order.lines.slice(0, 4).map((l) => (
              <span
                key={l.id}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  l.isPrepared ? "bg-green-100 text-green-700 line-through" : "bg-slate-100 text-slate-600"
                }`}
              >
                {l.product.name.length > 18 ? l.product.name.slice(0, 16) + "…" : l.product.name} ×{l.quantityOrdered}
              </span>
            ))}
            {order.lines.length > 4 && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-400">
                +{order.lines.length - 4} altri
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-6 w-6 text-slate-300 shrink-0 mt-1" />
      </div>
    </Link>
  )
}
