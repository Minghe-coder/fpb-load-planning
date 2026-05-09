import { getActiveProductsForSelect, getActiveCustomersForSelect } from "@/lib/queries"
import { db } from "@/lib/db"
import { NewShipmentForm } from "./shipment-form"

export default async function NewShipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ da?: string }>
}) {
  const sp = await searchParams
  const orderIds = sp.da ? sp.da.split(",").filter(Boolean) : []

  const [products, customers] = await Promise.all([
    getActiveProductsForSelect(),
    getActiveCustomersForSelect(),
  ])

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

  // Se arrivano ordini pre-selezionati, carica le loro righe
  let initialLines: { productId: string; customerId: string; quantityCartons: string }[] = []
  let fromOrderCustomerId = ""

  if (orderIds.length > 0) {
    const orders = await db.order.findMany({
      where: { id: { in: orderIds }, status: "READY" },
      include: { lines: true },
    })

    // Aggrega per prodotto+cliente (somma cartoni se stesso prodotto compare in più ordini)
    const lineMap = new Map<string, { productId: string; customerId: string; qty: number }>()
    for (const order of orders) {
      const custId = order.customerId ?? ""
      if (!fromOrderCustomerId && custId) fromOrderCustomerId = custId
      for (const l of order.lines) {
        const key = `${l.productId}::${custId}`
        const existing = lineMap.get(key)
        if (existing) existing.qty += l.quantityOrdered
        else lineMap.set(key, { productId: l.productId, customerId: custId, qty: l.quantityOrdered })
      }
    }
    initialLines = Array.from(lineMap.values()).map((l) => ({
      productId: l.productId,
      customerId: l.customerId,
      quantityCartons: String(l.qty),
    }))
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {orderIds.length > 0 ? `Nuova spedizione da ${orderIds.length} ${orderIds.length === 1 ? "ordine" : "ordini"}` : "Nuova spedizione"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Inserisci i dati della fattura di trasporto per allocare il costo sui prodotti
        </p>
      </div>
      <NewShipmentForm
        products={productsForClient}
        customers={customersForClient}
        initialLines={initialLines}
        initialCustomerId={fromOrderCustomerId}
        orderIds={orderIds}
      />
    </div>
  )
}
