import { getProductWithPricing, getProductTransportHistory, getProductPriceHistory, getSuppliers } from "@/lib/queries"
import { fmtEuro, fmtPct, marginBg, foodCategoryColor, foodCategoryLabel, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { PhysicalForm } from "./physical-form"
import { InlineEditField, ProductSelectField } from "./product-edit-form"
import { DeactivateProductButton } from "./deactivate-button"
import { notFound } from "next/navigation"
import { ArrowLeft, CheckCircle2, AlertCircle, Package, Truck, History, Archive } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/db"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export const dynamic = "force-dynamic"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, overheadRate, transportHistory, priceHistory, suppliers] = await Promise.all([
    getProductWithPricing(id),
    db.overheadRate.findFirst({ orderBy: { fiscalYear: "desc" } }),
    getProductTransportHistory(id),
    getProductPriceHistory(id),
    getSuppliers(),
  ])
  if (!product) notFound()

  const ratePct = Number(overheadRate?.ratePct ?? 0.2664)
  const industrialCost = Number(product.purchasePrice) * (1 + ratePct)

  // Costo import medio ponderato (€/pezzo)
  const totalImportCostEur = transportHistory.reduce((s, l) => s + Number(l.allocatedCostEur), 0)
  const totalImportUnits = transportHistory.reduce((s, l) => s + l.quantityUnits, 0)
  const avgImportCostPerUnit = totalImportUnits > 0 ? totalImportCostEur / totalImportUnits : 0
  const fullCostPerUnit = industrialCost + avgImportCostPerUnit

  // Densità (se dati fisici disponibili)
  let density: number | null = null
  if (product.physical) {
    const vol =
      (Number(product.physical.lengthCm) *
        Number(product.physical.widthCm) *
        Number(product.physical.heightCm)) /
      1_000_000
    density = vol > 0 ? Number(product.physical.grossWeightKg) / vol : null
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/prodotti"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Prodotti
        </Link>
        {!product.isActive && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
            <Archive className="h-3.5 w-3.5" /> Prodotto archiviato
          </div>
        )}
        <div className="flex items-start justify-between mt-1">
          <div>
            <InlineEditField
              productId={product.id}
              field="name"
              currentValue={product.name}
              label="Nome prodotto"
              type="text"
              displayClassName="text-2xl font-semibold text-slate-900 tracking-tight"
            />
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {product.sku}
              </span>
              <ProductSelectField
                productId={product.id}
                field="foodCategory"
                currentValue={product.foodCategory}
                options={[
                  { value: "DRY", label: "Secco" },
                  { value: "LIQUID", label: "Liquido" },
                  { value: "GLASS", label: "Vetro" },
                  { value: "PERISHABLE", label: "Fresco" },
                ]}
              />
              <ProductSelectField
                productId={product.id}
                field="fragilityClass"
                currentValue={product.fragilityClass}
                options={[
                  { value: "1", label: "Fragilità 1 (bassa)" },
                  { value: "2", label: "Fragilità 2 (media)" },
                  { value: "3", label: "Fragilità 3 (alta)" },
                ]}
              />
              <ProductSelectField
                productId={product.id}
                field="supplierId"
                currentValue={product.supplierId}
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>
          </div>
          <DeactivateProductButton id={product.id} name={product.name} isActive={product.isActive} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Prezzo acquisto — editable */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Prezzo acquisto</p>
          <div className="mt-1 text-xl font-bold tabular">
            <InlineEditField
              productId={product.id}
              field="purchasePrice"
              currentValue={Number(product.purchasePrice).toFixed(3)}
              label="Prezzo acquisto"
              prefix="€ "
              type="number"
              step="0.001"
              displayClassName="text-xl font-bold text-slate-900 tabular"
            />
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <InlineEditField
              productId={product.id}
              field="unitsPerCarton"
              currentValue={product.unitsPerCarton ?? ""}
              label="Pezzi per cartone"
              suffix=" pz/crt"
              type="number"
              step="1"
              displayClassName="text-[11px] text-slate-400"
              inputWidth="w-16"
            />
          </div>
        </div>
        {/* Costo industriale */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Costo industriale</p>
          <p className="mt-1 text-xl font-bold tabular text-slate-900">{fmtEuro(industrialCost)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">overhead {fmtPct(ratePct)}</p>
        </div>
        {/* Trasporto import/pz */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Trasporto import/pz</p>
          <p className="mt-1 text-xl font-bold tabular text-slate-900">
            {avgImportCostPerUnit > 0 ? fmtEuro(avgImportCostPerUnit) : "—"}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {avgImportCostPerUnit > 0 ? `${transportHistory.length} spedizioni` : "nessuna spedizione"}
          </p>
        </div>
        {/* Costo arrivo/pz */}
        <div className={cn("rounded-xl border p-4", avgImportCostPerUnit > 0 ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white")}>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Costo arrivo/pz</p>
          <p className={cn("mt-1 text-xl font-bold tabular", avgImportCostPerUnit > 0 ? "text-indigo-700" : "text-slate-900")}>
            {avgImportCostPerUnit > 0 ? fmtEuro(fullCostPerUnit) : "—"}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {avgImportCostPerUnit > 0 ? `+${fmtPct(avgImportCostPerUnit / industrialCost)} su ind.` : "inserire spedizioni"}
          </p>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 text-sm">
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-0.5 shrink-0 w-12">Note</span>
        <InlineEditField
          productId={product.id}
          field="notes"
          currentValue={product.notes ?? ""}
          label="Note"
          type="text"
          displayClassName="text-sm text-slate-600"
          inputWidth="w-80"
        />
      </div>

      {/* Dati fisici */}
      <div id="physical" className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Dati fisici cartone</h2>
            {product.physical ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5" /> Da inserire
              </span>
            )}
          </div>
          {density !== null && (
            <span className="text-xs text-slate-500">
              Densità: <span className="font-semibold text-slate-700">{Math.round(density)} kg/m³</span>
              {density > 300
                ? " · prodotto denso (stacking: base)"
                : density > 150
                ? " · densità media"
                : " · prodotto leggero (stacking: cima)"}
            </span>
          )}
        </div>
        <div className="p-6">
          <PhysicalForm productId={product.id} existing={product.physical ? {
            grossWeightKg: Number(product.physical.grossWeightKg),
            lengthCm: Number(product.physical.lengthCm),
            widthCm: Number(product.physical.widthCm),
            heightCm: Number(product.physical.heightCm),
            cartonsPerLayer: product.physical.cartonsPerLayer ?? undefined,
            layersPerPallet: product.physical.layersPerPallet ?? undefined,
          } : undefined} />
        </div>
      </div>

      {/* Listino clienti */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Listino clienti ({product.customerPricing.length})
          </h2>
          <Link
            href={`/listini/nuovo?productId=${product.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            + Aggiungi cliente
          </Link>
        </div>
        {product.customerPricing.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Prezzo lordo</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Net Net Price</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Margine comm.</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Margine reale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {product.customerPricing.map((cp) => {
                const nnp = Number(cp.netNetPrice)
                const commercialMargin = nnp > 0 ? (nnp - industrialCost) / nnp : 0
                const realMargin = nnp > 0 ? (nnp - fullCostPerUnit) / nnp : 0
                const delta = realMargin - commercialMargin
                return (
                  <tr key={cp.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-900">{cp.customer.name}</td>
                    <td className="px-5 py-3 text-right tabular text-slate-600">
                      {fmtEuro(Number(cp.grossPrice))}
                    </td>
                    <td className="px-5 py-3 text-right tabular font-semibold text-slate-900">
                      {fmtEuro(nnp)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge className={marginBg(commercialMargin)}>{fmtPct(commercialMargin)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {avgImportCostPerUnit > 0 ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Badge className={marginBg(realMargin)}>{fmtPct(realMargin)}</Badge>
                          <span className="text-[10px] text-red-500 font-medium">{fmtPct(delta)}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300">— nessun import</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            Nessun listino attivo. Clicca "+ Aggiungi cliente" per iniziare.
          </div>
        )}
      </div>

      {/* Storico trasporti import */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <Truck className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          <h2 className="text-base font-semibold text-slate-900">Storico trasporti import</h2>
          {transportHistory.length > 0 && (
            <span className="ml-1 text-xs text-slate-400">
              · media ponderata: <span className="font-semibold text-slate-600">{fmtEuro(avgImportCostPerUnit)}/pz</span>
            </span>
          )}
        </div>
        {transportHistory.length === 0 ? (
          <div className="flex items-center gap-2 px-6 py-8 text-slate-400">
            <Truck className="h-5 w-5" strokeWidth={1} />
            <p className="text-sm">Nessuna spedizione import registrata per questo prodotto.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Codice</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tratta</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Vettore</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Qtà (pz)</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Costo/pz</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Costo tot.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transportHistory.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 text-slate-500 tabular">
                    {format(new Date(line.shipment.shipmentDate), "d MMM yyyy", { locale: it })}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/spedizioni/${line.shipmentId}`} className="font-mono text-xs text-indigo-600 hover:underline">
                      {line.shipment.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">
                    {line.shipment.routeFrom} → {line.shipment.routeTo}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{line.shipment.carrier}</td>
                  <td className="px-5 py-3 text-right tabular text-slate-600">{line.quantityUnits}</td>
                  <td className="px-5 py-3 text-right tabular font-semibold text-slate-900">
                    {fmtEuro(Number(line.allocatedCostPerUnitEur), 4)}
                  </td>
                  <td className="px-5 py-3 text-right tabular text-slate-700">
                    {fmtEuro(Number(line.allocatedCostEur))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Storico variazioni prezzo acquisto */}
      {priceHistory.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <History className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
            <h2 className="text-base font-semibold text-slate-900">Storico variazioni prezzo acquisto</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Prezzo precedente</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Nuovo prezzo</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Variazione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {priceHistory.map((h) => {
                const delta = Number(h.newPrice) - Number(h.oldPrice)
                const deltaPct = Number(h.oldPrice) > 0 ? delta / Number(h.oldPrice) : 0
                return (
                  <tr key={h.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-slate-500 tabular text-xs">
                      {format(new Date(h.changedAt), "d MMM yyyy, HH:mm", { locale: it })}
                    </td>
                    <td className="px-5 py-3 text-right tabular text-slate-600">{fmtEuro(Number(h.oldPrice), 3)}</td>
                    <td className="px-5 py-3 text-right tabular font-semibold text-slate-900">{fmtEuro(Number(h.newPrice), 3)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={delta > 0 ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
                        {delta > 0 ? "+" : ""}{fmtPct(deltaPct)}
                      </span>
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
