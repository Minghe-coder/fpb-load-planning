import { notFound } from "next/navigation"
import Link from "next/link"
import { getOrderDetail } from "@/lib/queries"
import { updateOrderStatus, deleteOrder } from "@/lib/actions/order"
import {
  ArrowLeft, Package, Truck, Clock, CheckCircle, AlertCircle,
  Send, FileText, Printer,
} from "lucide-react"
import { DeleteOrderButton } from "./delete-button"
import { StatusSelect } from "./status-select"

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:        { label: "In attesa",       color: "bg-slate-100 text-slate-700",  icon: <Clock className="h-4 w-4" /> },
  IN_PREPARATION: { label: "In preparazione", color: "bg-amber-100 text-amber-700",  icon: <AlertCircle className="h-4 w-4" /> },
  READY:          { label: "Pronto",          color: "bg-green-100 text-green-700",  icon: <CheckCircle className="h-4 w-4" /> },
  SHIPPED:        { label: "Spedito",         color: "bg-blue-100 text-blue-700",    icon: <Send className="h-4 w-4" /> },
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrderDetail(id)
  if (!order) notFound()

  const st = STATUS_MAP[order.status] ?? STATUS_MAP.PENDING
  const counterpart = order.customer?.name ?? order.supplier?.name ?? "—"
  const displayNumber = order.orderNumber ?? `#${order.id.slice(-6).toUpperCase()}`

  const totalCartons = order.lines.reduce((s, l) => s + l.quantityOrdered, 0)
  const preparedCartons = order.lines.reduce((s, l) => s + l.quantityPrepared, 0)
  const doneLine = order.lines.filter((l) => l.isPrepared).length

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/ordini" className="mt-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{displayNumber}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${st.color}`}>
              {st.icon}{st.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {order.type === "OUTGOING" ? <Truck className="h-3 w-3" /> : <Package className="h-3 w-3" />}
              {order.type === "OUTGOING" ? "Uscita" : "Entrata"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{counterpart}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/ordini/${id}/stampa`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-4 w-4" /> Stampa
          </Link>
          <StatusSelect orderId={id} currentStatus={order.status} />
          <DeleteOrderButton orderId={id} />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Prodotti", value: order.lines.length },
          { label: "Cartoni totali", value: totalCartons },
          { label: "Righe completate", value: `${doneLine} / ${order.lines.length}` },
          { label: "Data richiesta", value: order.requestedDate ? new Date(order.requestedDate).toLocaleDateString("it-IT") : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Meta */}
      {(order.notes || order.warehouseNotes || order.sourceFile || order.shipment) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 text-sm">
          {order.notes && <p className="text-slate-700"><span className="font-medium text-slate-500">Note:</span> {order.notes}</p>}
          {order.warehouseNotes && <p className="text-slate-700"><span className="font-medium text-slate-500">Note magazzino:</span> {order.warehouseNotes}</p>}
          {order.sourceFile && (
            <p className="flex items-center gap-1.5 text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              Importato da: <span className="font-medium text-slate-700">{order.sourceFile}</span>
            </p>
          )}
          {order.shipment && (
            <p className="text-slate-700">
              <span className="font-medium text-slate-500">Spedizione:</span>{" "}
              <Link href={`/spedizioni/${order.shipment.id}`} className="text-indigo-600 hover:underline">
                {order.shipment.code}
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Lines table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Righe ordine</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Prodotto</th>
              <th className="px-4 py-3 text-center">Qtà ordinata</th>
              <th className="px-4 py-3 text-center">Preparati</th>
              <th className="px-4 py-3 text-left">Lotto</th>
              <th className="px-4 py-3 text-left">Stato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.lines.map((l) => (
              <tr key={l.id} className={l.isPrepared ? "bg-green-50/40" : ""}>
                <td className="px-4 py-3">
                  <Link href={`/prodotti/${l.productId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {l.product.name}
                  </Link>
                  <p className="text-xs text-slate-400 font-mono">{l.product.sku}</p>
                </td>
                <td className="px-4 py-3 text-center font-semibold text-slate-900">{l.quantityOrdered}</td>
                <td className="px-4 py-3 text-center text-slate-600">{l.quantityPrepared}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{l.lotNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  {l.isPrepared ? (
                    <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                      <CheckCircle className="h-3.5 w-3.5" /> Pronto
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                      <Clock className="h-3.5 w-3.5" /> In attesa
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.preparedBy && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
            Preparato da {order.preparedBy.name} il {order.preparedAt ? new Date(order.preparedAt).toLocaleString("it-IT") : "—"}
          </div>
        )}
      </div>
    </div>
  )
}
