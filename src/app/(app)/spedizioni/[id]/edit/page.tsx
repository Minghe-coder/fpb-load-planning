import { getShipmentDetail } from "@/lib/queries"
import { notFound } from "next/navigation"
import { ShipmentEditForm } from "./shipment-edit-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function EditShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const shipment = await getShipmentDetail(id)
  if (!shipment) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/spedizioni/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> {shipment.code}
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">
        Modifica spedizione
      </h1>
      <ShipmentEditForm
        id={shipment.id}
        initialData={{
          carrier: shipment.carrier,
          routeFrom: shipment.routeFrom,
          routeTo: shipment.routeTo,
          shipmentDate: new Date(shipment.shipmentDate).toISOString().split("T")[0],
          totalCostEur: Number(shipment.totalCostEur),
          volumetricCoefficient: Number(shipment.volumetricCoefficient),
          notes: shipment.notes ?? "",
        }}
        lineCount={shipment.lines.length}
      />
    </div>
  )
}
