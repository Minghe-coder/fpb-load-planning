import { getPricingById, getActiveProductsForSelect, getActiveCustomersForSelect } from "@/lib/queries"
import { db } from "@/lib/db"
import { PricingForm } from "../../nuovo/pricing-form"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function EditListinoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [pricing, rawProducts, customers, overheadRate] = await Promise.all([
    getPricingById(id),
    getActiveProductsForSelect(),
    getActiveCustomersForSelect(),
    db.overheadRate.findFirst({ orderBy: { fiscalYear: "desc" } }),
  ])

  if (!pricing) notFound()

  const products = rawProducts.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    purchasePrice: Number(p.purchasePrice),
  }))

  const customersForClient = customers.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }))

  const existing = {
    id: pricing.id,
    customerId: pricing.customerId,
    productId: pricing.productId,
    grossPrice: Number(pricing.grossPrice),
    discount1: Number(pricing.discount1),
    discount2: Number(pricing.discount2),
    discount3: Number(pricing.discount3),
    contractualContribPct: Number(pricing.contractualContribPct),
    promotionalContribPct: Number(pricing.promotionalContribPct),
    promotionalActivitiesPct: Number(pricing.promotionalActivitiesPct),
    listingFeePct: Number(pricing.listingFeePct),
    commissionPct: Number(pricing.commissionPct),
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link
          href="/listini"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Listini
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
          Aggiorna listino
        </h1>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
            {pricing.product.sku}
          </span>
          <span className="text-sm text-slate-500">
            {pricing.customer.name} · {pricing.product.name}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Il listino attuale verrà storicizzato e sostituito dal nuovo.
        </p>
      </div>
      <PricingForm
        products={products}
        customers={customersForClient}
        overheadRatePct={Number(overheadRate?.ratePct ?? 0.2664)}
        existing={existing}
      />
    </div>
  )
}
