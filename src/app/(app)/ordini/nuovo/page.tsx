import { getActiveProductsForSelect, getActiveCustomersForSelect, getSuppliers } from "@/lib/queries"
import { NewOrderForm } from "./order-form"

export default async function NuovoOrdinePage() {
  const [products, customers, suppliers] = await Promise.all([
    getActiveProductsForSelect(),
    getActiveCustomersForSelect(),
    getSuppliers(),
  ])

  const productsForClient = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unitsPerCarton: p.unitsPerCarton ?? 1,
  }))

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Nuovo ordine</h1>
        <p className="mt-1 text-sm text-slate-500">
          Inserisci manualmente o importa da PDF (il file non viene salvato, solo analizzato)
        </p>
      </div>
      <NewOrderForm
        products={productsForClient}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  )
}
