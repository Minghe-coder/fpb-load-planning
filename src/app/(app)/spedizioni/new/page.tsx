import { getActiveProductsForSelect, getActiveCustomersForSelect } from "@/lib/queries"
import { NewShipmentForm } from "./shipment-form"

export default async function NewShipmentPage() {
  const [products, customers] = await Promise.all([
    getActiveProductsForSelect(),
    getActiveCustomersForSelect(),
  ])

  // Serializza solo i campi necessari (fisici + nome) per il client
  const productsForClient = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unitsPerCarton: p.unitsPerCarton ?? 1,
    hasPhysical: !!p.physical,
    fragilityClass: p.fragilityClass,
    foodCategory: p.foodCategory,
    physical: p.physical
      ? {
          grossWeightKg: Number(p.physical.grossWeightKg),
          lengthCm: Number(p.physical.lengthCm),
          widthCm: Number(p.physical.widthCm),
          heightCm: Number(p.physical.heightCm),
        }
      : null,
  }))

  const customersForClient = customers.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }))

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Nuova spedizione
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Inserisci i dati della fattura di trasporto per allocare il costo sui prodotti
        </p>
      </div>
      <NewShipmentForm products={productsForClient} customers={customersForClient} />
    </div>
  )
}
