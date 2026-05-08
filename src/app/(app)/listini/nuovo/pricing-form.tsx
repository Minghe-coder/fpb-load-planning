"use client"

import { useState, useTransition, useMemo } from "react"
import { createPricing } from "@/lib/actions/pricing"
import { calcNNP, type PricingInput } from "@/lib/pricing-utils"
import { AlertCircle, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface Product { id: string; sku: string; name: string; purchasePrice: number }
interface Customer { id: string; name: string; type: string }

interface Existing {
  id: string
  customerId: string
  productId: string
  grossPrice: number
  discount1: number
  discount2: number
  discount3: number
  contractualContribPct: number
  promotionalContribPct: number
  promotionalActivitiesPct: number
  listingFeePct: number
  commissionPct: number
}

interface Props {
  products: Product[]
  customers: Customer[]
  overheadRatePct: number
  preselectedCustomerId?: string
  preselectedProductId?: string
  existing?: Existing
}

export function PricingForm({
  products,
  customers,
  overheadRatePct,
  preselectedCustomerId,
  preselectedProductId,
  existing,
}: Props) {
  const isEdit = !!existing
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [customerId, setCustomerId] = useState(existing?.customerId ?? preselectedCustomerId ?? customers[0]?.id ?? "")
  const [productId, setProductId] = useState(existing?.productId ?? preselectedProductId ?? products[0]?.id ?? "")
  const [grossPrice, setGrossPrice] = useState(existing?.grossPrice?.toString() ?? "")
  const [discount1, setDiscount1] = useState(existing?.discount1?.toString() ?? "0")
  const [discount2, setDiscount2] = useState(existing?.discount2?.toString() ?? "0")
  const [discount3, setDiscount3] = useState(existing?.discount3?.toString() ?? "0")
  // contributions stored as decimals (0.05), displayed as % (5)
  const [contractual, setContractual] = useState(((existing?.contractualContribPct ?? 0) * 100).toString())
  const [promotional, setPromotional] = useState(((existing?.promotionalContribPct ?? 0) * 100).toString())
  const [activities, setActivities] = useState(((existing?.promotionalActivitiesPct ?? 0) * 100).toString())
  const [listing, setListing] = useState(((existing?.listingFeePct ?? 0) * 100).toString())
  const [commission, setCommission] = useState(((existing?.commissionPct ?? 0) * 100).toString())

  // Live NNP preview
  const preview = useMemo(() => {
    const gp = parseFloat(grossPrice) || 0
    const d1 = parseFloat(discount1) || 0
    const d2 = parseFloat(discount2) || 0
    const d3 = parseFloat(discount3) || 0
    const c = (parseFloat(contractual) || 0) / 100
    const p = (parseFloat(promotional) || 0) / 100
    const a = (parseFloat(activities) || 0) / 100
    const l = (parseFloat(listing) || 0) / 100
    const cm = (parseFloat(commission) || 0) / 100

    if (gp <= 0) return null
    const netPrice = gp - d1 - d2 - d3
    const totalPct = c + p + a + l + cm
    const nnp = netPrice * (1 - totalPct)

    const selectedProduct = products.find((pr) => pr.id === productId)
    const industrialCost = selectedProduct
      ? selectedProduct.purchasePrice * (1 + overheadRatePct)
      : null
    const commercialMargin = industrialCost && nnp > 0 ? (nnp - industrialCost) / nnp : null

    return { netPrice, totalPct, nnp, commercialMargin }
  }, [grossPrice, discount1, discount2, discount3, contractual, promotional, activities, listing, commission, productId, products, overheadRatePct])

  const lockCustomer = !!(preselectedCustomerId || existing)
  const lockProduct = !!(preselectedProductId || existing)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const input: PricingInput = {
      customerId,
      productId,
      grossPrice: parseFloat(grossPrice),
      discount1: parseFloat(discount1) || 0,
      discount2: parseFloat(discount2) || 0,
      discount3: parseFloat(discount3) || 0,
      contractualContribPct: (parseFloat(contractual) || 0) / 100,
      promotionalContribPct: (parseFloat(promotional) || 0) / 100,
      promotionalActivitiesPct: (parseFloat(activities) || 0) / 100,
      listingFeePct: (parseFloat(listing) || 0) / 100,
      commissionPct: (parseFloat(commission) || 0) / 100,
    }

    startTransition(async () => {
      const result = await createPricing(input)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cliente + Prodotto */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Anagrafica</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cliente *</label>
            {lockCustomer ? (
              <div className={inputCls + " bg-slate-50 text-slate-500"}>
                {customers.find((c) => c.id === customerId)?.name ?? customerId}
              </div>
            ) : (
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required className={inputCls}>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Prodotto *</label>
            {lockProduct ? (
              <div className={inputCls + " bg-slate-50 text-slate-500"}>
                {products.find((p) => p.id === productId)?.name ?? productId}
              </div>
            ) : (
              <select value={productId} onChange={(e) => setProductId(e.target.value)} required className={inputCls}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Prezzo e sconti */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prezzo e sconti (€)</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <EuroField label="Prezzo lordo *" value={grossPrice} onChange={setGrossPrice} required />
          <EuroField label="Sconto 1" value={discount1} onChange={setDiscount1} />
          <EuroField label="Sconto 2" value={discount2} onChange={setDiscount2} />
          <EuroField label="Sconto 3" value={discount3} onChange={setDiscount3} />
        </div>
        {preview && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            <span>Prezzo netto sconti:</span>
            <span className="font-semibold text-slate-900">{preview.netPrice.toFixed(4)} €</span>
          </div>
        )}
      </div>

      {/* Contributi */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contributi (%)</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <PctField label="Contributi contratt." value={contractual} onChange={setContractual} />
          <PctField label="Contributi promo." value={promotional} onChange={setPromotional} />
          <PctField label="Attività promo." value={activities} onChange={setActivities} />
          <PctField label="Listing fee" value={listing} onChange={setListing} />
          <PctField label="Commissioni" value={commission} onChange={setCommission} />
        </div>
        {preview && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            <span>Totale contributi:</span>
            <span className="font-semibold text-slate-900">{(preview.totalPct * 100).toFixed(2)}%</span>
          </div>
        )}
      </div>

      {/* NNP Preview */}
      {preview && (
        <div className={cn(
          "rounded-xl border p-5 flex items-center justify-between",
          preview.nnp <= 0
            ? "border-red-200 bg-red-50"
            : preview.commercialMargin !== null && preview.commercialMargin < 0.1
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50"
        )}>
          <div className="flex items-center gap-3">
            <TrendingUp className={cn("h-5 w-5", preview.nnp <= 0 ? "text-red-500" : "text-emerald-600")} strokeWidth={1.75} />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Net Price</p>
              <p className={cn("text-2xl font-bold tabular", preview.nnp <= 0 ? "text-red-700" : "text-slate-900")}>
                {preview.nnp.toFixed(4)} €
              </p>
            </div>
          </div>
          {preview.commercialMargin !== null && (
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Margine commerciale</p>
              <p className={cn(
                "text-2xl font-bold tabular",
                preview.commercialMargin < 0 ? "text-red-700" : preview.commercialMargin < 0.1 ? "text-amber-700" : "text-emerald-700"
              )}>
                {(preview.commercialMargin * 100).toFixed(1)}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">senza trasporti</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <a href="/listini" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          Annulla
        </a>
        <button
          type="submit"
          disabled={isPending || !preview || preview.nnp <= 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Salvataggio…" : isEdit ? "Aggiorna listino" : "Salva listino"}
        </button>
      </div>
    </form>
  )
}

function EuroField({ label, value, onChange, required }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
        <input
          type="number" step="0.0001" min="0"
          value={value} onChange={(e) => onChange(e.target.value)}
          required={required}
          className={inputCls + " pl-7"}
          placeholder="0.0000"
        />
      </div>
    </div>
  )
}

function PctField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number" step="0.01" min="0" max="100"
          value={value} onChange={(e) => onChange(e.target.value)}
          className={inputCls + " pr-7"}
          placeholder="0"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
      </div>
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
