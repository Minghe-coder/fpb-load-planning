import { getShipmentDetail } from "@/lib/queries"
import { fmtEuro, fmtKg, fmtPct, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { ArrowLeft, BarChart3, Pencil, ClipboardList } from "lucide-react"
import Link from "next/link"
import { DeleteShipmentButton } from "./delete-button"
import { DeleteLineButton } from "./delete-line-button"
import { PrintShipmentButton } from "./print-button"

export const dynamic = "force-dynamic"

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const shipment = await getShipmentDetail(id)
  if (!shipment) notFound()

  const totalEffective = shipment.lines.reduce(
    (s, l) => s + Number(l.effectiveWeightKg), 0
  )
  const totalReal = shipment.lines.reduce(
    (s, l) => s + Number(l.realWeightKg), 0
  )
  const totalVolume = shipment.lines.reduce(
    (s, l) => s + Number(l.volumeM3), 0
  )

  // Raggruppa per cliente se multi-cliente
  const byCustomer = new Map<string, typeof shipment.lines>()
  for (const line of shipment.lines) {
    const key = line.customer?.name ?? "—"
    if (!byCustomer.has(key)) byCustomer.set(key, [])
    byCustomer.get(key)!.push(line)
  }
  const isMultiCustomer = byCustomer.size > 1

  return (
    <div className="flex flex-col gap-6 p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/spedizioni"
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Spedizioni
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight font-mono">
            {shipment.code}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              className={
                shipment.legType === "IMPORT"
                  ? "bg-violet-50 text-violet-700 ring-violet-200"
                  : "bg-sky-50 text-sky-700 ring-sky-200"
              }
            >
              {shipment.legType === "IMPORT" ? "Import" : "Distribuzione"}
            </Badge>
            <span className="text-sm text-slate-500">
              {format(new Date(shipment.shipmentDate), "d MMMM yyyy", { locale: it })}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500">{shipment.carrier}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500">
              {shipment.routeFrom} → {shipment.routeTo}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PrintShipmentButton shipment={{
            code: shipment.code,
            legType: shipment.legType,
            shipmentDate: shipment.shipmentDate.toString(),
            carrier: shipment.carrier,
            routeFrom: shipment.routeFrom,
            routeTo: shipment.routeTo,
            totalCostEur: shipment.totalCostEur.toString(),
            volumetricCoefficient: shipment.volumetricCoefficient.toString(),
            notes: shipment.notes,
            lines: shipment.lines.map((l) => ({
              product: { name: l.product.name, sku: l.product.sku },
              quantityCartons: l.quantityCartons,
              quantityUnits: l.quantityUnits,
              realWeightKg: l.realWeightKg.toString(),
              volumeM3: l.volumeM3.toString(),
              effectiveWeightKg: l.effectiveWeightKg.toString(),
              volumetricWeightKg: l.volumetricWeightKg.toString(),
              allocatedCostEur: l.allocatedCostEur.toString(),
              allocatedCostPerUnitEur: l.allocatedCostPerUnitEur.toString(),
              customer: l.customer ? { name: l.customer.name } : null,
            })),
          }} />
          <Link
            href={`/spedizioni/${shipment.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Modifica
          </Link>
          <DeleteShipmentButton id={shipment.id} code={shipment.code} />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Costo totale", value: fmtEuro(Number(shipment.totalCostEur)), accent: true },
          { label: "Peso reale", value: fmtKg(totalReal) },
          { label: "Volume", value: totalVolume.toFixed(2) + " m³" },
          { label: "Ingombro eff.", value: fmtKg(totalEffective) },
          { label: "Coeff. volumetrico", value: Number(shipment.volumetricCoefficient) + " kg/m³" },
        ].map((k) => (
          <div
            key={k.label}
            className={cn(
              "rounded-xl border p-4",
              k.accent
                ? "border-indigo-200 bg-indigo-50"
                : "border-slate-200 bg-white"
            )}
          >
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{k.label}</p>
            <p className={cn("mt-1.5 text-xl font-bold tabular", k.accent ? "text-indigo-700" : "text-slate-900")}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Ordini collegati */}
      {shipment.orders.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 bg-slate-50/60">
            <ClipboardList className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
            <span className="font-semibold text-sm text-slate-700">Generata da</span>
          </div>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {shipment.orders.map((o) => {
              const statusMap: Record<string, { label: string; className: string }> = {
                PENDING:        { label: "In attesa",      className: "bg-slate-100 text-slate-600 ring-slate-200" },
                IN_PREPARATION: { label: "In preparazione", className: "bg-sky-50 text-sky-700 ring-sky-200" },
                READY:          { label: "Pronto",          className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
                SHIPPED:        { label: "Spedito",         className: "bg-violet-50 text-violet-700 ring-violet-200" },
              }
              const s = statusMap[o.status] ?? { label: o.status, className: "bg-slate-100 text-slate-600 ring-slate-200" }
              const label = o.customer?.name ?? o.supplier?.name ?? "—"
              return (
                <Link
                  key={o.id}
                  href={`/ordini/${o.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-mono text-sm font-semibold text-slate-800">
                    {o.orderNumber ?? o.id.slice(0, 8)}
                  </span>
                  <span className="text-xs text-slate-500">{label}</span>
                  <Badge className={s.className}>{s.label}</Badge>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabella allocazione */}
      {isMultiCustomer ? (
        // Multi-cliente: mostra sezione per ogni cliente
        <div className="space-y-4">
          {Array.from(byCustomer.entries()).map(([customerName, lines]) => {
            const customerTotal = lines.reduce(
              (s, l) => s + Number(l.allocatedCostEur), 0
            )
            const customerShare = customerTotal / Number(shipment.totalCostEur)
            return (
              <div key={customerName} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">{customerName}</span>
                    <Badge className="bg-slate-100 text-slate-600 ring-slate-200">
                      {fmtPct(customerShare)} del totale
                    </Badge>
                  </div>
                  <span className="font-bold text-slate-900 tabular">{fmtEuro(customerTotal)}</span>
                </div>
                <AllocationTable lines={lines} shipmentId={shipment.id} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 bg-slate-50/60">
            <BarChart3 className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
            <span className="font-semibold text-sm text-slate-700">Allocazione per prodotto</span>
          </div>
          <AllocationTable lines={shipment.lines} shipmentId={shipment.id} />
        </div>
      )}
    </div>
  )
}

type ShipmentLines = NonNullable<Awaited<ReturnType<typeof getShipmentDetail>>>["lines"]

function AllocationTable({ lines, shipmentId }: { lines: ShipmentLines; shipmentId: string }) {
  if (!lines) return null
  const totalEff = lines.reduce((s: number, l: ShipmentLines[number]) => s + Number(l.effectiveWeightKg), 0)

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Prodotto</th>
          <th className="px-5 py-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Cartoni</th>
          <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Peso reale</th>
          <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ing. effettivo</th>
          <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Share</th>
          <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Costo tot.</th>
          <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">€/pezzo</th>
          <th className="px-5 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {lines.map((l) => {
          const share = totalEff > 0 ? Number(l.effectiveWeightKg) / totalEff : 0
          const isVolumetric = Number(l.volumetricWeightKg) > Number(l.realWeightKg)
          return (
            <tr key={l.id} className="hover:bg-slate-50/50 group">
              <td className="px-5 py-3">
                <p className="font-medium text-slate-900">{l.product.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 rounded">
                    {l.product.sku}
                  </span>
                  {isVolumetric && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 rounded">
                      vol. &gt; peso
                    </span>
                  )}
                </div>
              </td>
              <td className="px-5 py-3 text-center tabular text-slate-600">{l.quantityCartons}</td>
              <td className="px-5 py-3 text-right tabular text-slate-600">{fmtKg(Number(l.realWeightKg))}</td>
              <td className="px-5 py-3 text-right tabular font-medium text-slate-900">
                {fmtKg(Number(l.effectiveWeightKg))}
              </td>
              <td className="px-5 py-3 text-right tabular text-slate-500">{fmtPct(share)}</td>
              <td className="px-5 py-3 text-right tabular font-bold text-slate-900">
                {fmtEuro(Number(l.allocatedCostEur))}
              </td>
              <td className="px-5 py-3 text-right tabular text-slate-600">
                {fmtEuro(Number(l.allocatedCostPerUnitEur), 4)}
              </td>
              <td className="px-5 py-3">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DeleteLineButton lineId={l.id} shipmentId={shipmentId} />
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
