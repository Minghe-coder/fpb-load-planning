import { notFound } from "next/navigation"
import Link from "next/link"
import { getOrderDetail } from "@/lib/queries"
import { ArrowLeft } from "lucide-react"
import { WarehouseOrderClient } from "./warehouse-client"

export const dynamic = "force-dynamic"

export default async function WarehouseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrderDetail(id)
  if (!order) notFound()

  const serialized = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    type: order.type,
    counterpart: order.customer?.name ?? order.supplier?.name ?? null,
    requestedDate: order.requestedDate?.toISOString() ?? null,
    notes: order.notes,
    warehouseNotes: order.warehouseNotes,
    lines: order.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product.name,
      productSku: l.product.sku,
      fragilityClass: l.product.fragilityClass as 1 | 2 | 3,
      foodCategory: l.product.foodCategory,
      quantityOrdered: l.quantityOrdered,
      quantityPrepared: l.quantityPrepared,
      isPrepared: l.isPrepared,
      lotNumber: l.lotNumber,
      notes: l.notes,
      physical: l.product.physical
        ? {
            grossWeightKg: Number(l.product.physical.grossWeightKg),
            lengthCm: Number(l.product.physical.lengthCm),
            widthCm: Number(l.product.physical.widthCm),
            heightCm: Number(l.product.physical.heightCm),
          }
        : null,
    })),
  }

  return (
    <div className="p-4 pb-10 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/magazzino"
          className="rounded-xl bg-white border border-slate-200 p-2.5 text-slate-500 shadow-sm hover:bg-slate-50 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">
            {order.orderNumber ?? `#${order.id.slice(-6).toUpperCase()}`}
          </h1>
          {(order.customer?.name ?? order.supplier?.name) && (
            <p className="text-sm text-slate-500 truncate">{order.customer?.name ?? order.supplier?.name}</p>
          )}
        </div>
      </div>

      <WarehouseOrderClient order={serialized} />
    </div>
  )
}
