import { getActiveProductsForSelect, getActiveCustomersForSelect } from "@/lib/queries"
import { db } from "@/lib/db"
import { PricingForm } from "./pricing-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NuovoListinoPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; productId?: string }>
}) {
  const { customerId, productId } = await searchParams

  const [rawProducts, customers, overheadRate] = await Promise.all([
    getActiveProductsForSelect(),
    getActiveCustomersForSelect(),
    db.overheadRate.findFirst({ orderBy: { fiscalYear: "desc" } }),
  ])

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
          Nuovo listino
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Il listino precedente per questo cliente+prodotto verrà storicizzato automaticamente.
        </p>
      </div>
      <PricingForm
        products={products}
        customers={customersForClient}
        overheadRatePct={Number(overheadRate?.ratePct ?? 0.2664)}
        preselectedCustomerId={customerId}
        preselectedProductId={productId}
      />
    </div>
  )
}
