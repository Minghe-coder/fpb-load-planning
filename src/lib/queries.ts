import { db } from "./db"

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [productCount, customerCount, shipmentCount, pricings, overheadRate] =
    await Promise.all([
      db.product.count({ where: { isActive: true } }),
      db.customer.count({ where: { isActive: true } }),
      db.shipment.count(),
      db.customerPricing.findMany({
        where: { validTo: null },
        include: { product: true },
      }),
      db.overheadRate.findFirst({ orderBy: { fiscalYear: "desc" } }),
    ])

  const ratePct = Number(overheadRate?.ratePct ?? 0.2664)

  const margins = pricings.map((p) => {
    const nnp = Number(p.netNetPrice)
    const cost = Number(p.product.purchasePrice) * (1 + ratePct)
    const margin = nnp > 0 ? (nnp - cost) / nnp : 0
    return {
      margin,
      productId: p.productId,
      productName: p.product.name,
      foodCategory: p.product.foodCategory,
      customerId: p.customerId,
    }
  })

  const avgMargin = margins.length
    ? margins.reduce((s, m) => s + m.margin, 0) / margins.length
    : 0

  // Media per prodotto (raggruppato)
  const byProduct = new Map<string, typeof margins>()
  for (const m of margins) {
    if (!byProduct.has(m.productId)) byProduct.set(m.productId, [])
    byProduct.get(m.productId)!.push(m)
  }

  const productMargins = Array.from(byProduct.values())
    .map((ms: typeof margins) => ({
      productName: ms[0].productName,
      foodCategory: ms[0].foodCategory,
      avgMargin: ms.reduce((s: number, m: typeof margins[0]) => s + m.margin, 0) / ms.length,
      minMargin: Math.min(...ms.map((m: typeof margins[0]) => m.margin)),
      maxMargin: Math.max(...ms.map((m: typeof margins[0]) => m.margin)),
      customerCount: ms.length,
    }))
    .sort((a, b) => b.avgMargin - a.avgMargin)

  const productsWithoutPhysical = await db.product.count({
    where: { isActive: true, physical: null },
  })

  // Costo import medio per prodotto (per margine reale)
  const importLines = await db.shipmentLine.findMany({
    where: { shipment: { legType: "IMPORT" } },
    select: { productId: true, allocatedCostEur: true, quantityUnits: true },
  })
  const importByProduct = new Map<string, { cost: number; units: number }>()
  for (const l of importLines) {
    const cur = importByProduct.get(l.productId) ?? { cost: 0, units: 0 }
    importByProduct.set(l.productId, { cost: cur.cost + Number(l.allocatedCostEur), units: cur.units + l.quantityUnits })
  }

  // Margine reale medio (solo prodotti con almeno un import)
  const realMargins = margins.map((m) => {
    const imp = importByProduct.get(m.productId)
    const importPerUnit = imp && imp.units > 0 ? imp.cost / imp.units : 0
    const fullCost = Number(pricings.find((p) => p.productId === m.productId)?.product.purchasePrice ?? 0) * (1 + ratePct) + importPerUnit
    const nnp = Number(pricings.find((p) => p.productId === m.productId && p.customerId === m.customerId)?.netNetPrice ?? 0)
    return nnp > 0 && importPerUnit > 0 ? (nnp - fullCost) / nnp : null
  }).filter((m): m is number => m !== null)

  const avgRealMargin = realMargins.length
    ? realMargins.reduce((s, m) => s + m, 0) / realMargins.length
    : null

  return {
    productCount,
    customerCount,
    shipmentCount,
    avgMargin,
    avgRealMargin,
    productMargins,
    productsWithoutPhysical,
    overheadRatePct: ratePct,
    overheadYear: overheadRate?.fiscalYear ?? 2024,
  }
}

// ─── Prodotti ─────────────────────────────────────────────────────────────────

export async function getProducts(opts?: { showInactive?: boolean }) {
  return db.product.findMany({
    where: { isActive: opts?.showInactive ? false : true },
    include: {
      supplier: true,
      physical: true,
      _count: { select: { customerPricing: { where: { validTo: null } } } },
    },
    orderBy: { name: "asc" },
  })
}

export async function getProductWithPricing(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      supplier: true,
      physical: true,
      customerPricing: {
        where: { validTo: null },
        include: { customer: true },
        orderBy: { netNetPrice: "desc" },
      },
    },
  })
}

// ─── Spedizioni ───────────────────────────────────────────────────────────────

export async function getShipments(opts?: {
  q?: string
  tipo?: string
  from?: string
  to?: string
}) {
  const { q, tipo, from, to } = opts ?? {}
  return db.shipment.findMany({
    where: {
      ...(tipo === "IMPORT" || tipo === "DISTRIBUTION" ? { legType: tipo } : {}),
      ...(from ? { shipmentDate: { gte: new Date(from) } } : {}),
      ...(to ? { shipmentDate: { lte: new Date(to + "T23:59:59") } } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { carrier: { contains: q } },
              { routeFrom: { contains: q } },
              { routeTo: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { lines: true } },
      lines: {
        select: {
          allocatedCostEur: true,
          realWeightKg: true,
          volumeM3: true,
          effectiveWeightKg: true,
        },
      },
    },
    orderBy: { shipmentDate: "desc" },
  })
}

export async function getShipmentDetail(id: string) {
  return db.shipment.findUnique({
    where: { id },
    include: {
      lines: {
        include: { product: true, customer: true },
        orderBy: { effectiveWeightKg: "desc" },
      },
    },
  })
}

// ─── Clienti ──────────────────────────────────────────────────────────────────

export async function getCustomers(q?: string, opts?: { showInactive?: boolean }) {
  return db.customer.findMany({
    where: {
      isActive: opts?.showInactive ? false : true,
      ...(q ? { name: { contains: q } } : {}),
    },
    include: {
      _count: { select: { pricing: { where: { validTo: null } } } },
    },
    orderBy: { name: "asc" },
  })
}

export async function getProductPriceHistory(productId: string) {
  return db.productPriceHistory.findMany({
    where: { productId },
    orderBy: { changedAt: "desc" },
  })
}

export async function getSupplierWithProducts(id: string) {
  return db.supplier.findUnique({
    where: { id },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: { _count: { select: { customerPricing: { where: { validTo: null } } } } },
      },
    },
  })
}

// ─── Helpers per form ─────────────────────────────────────────────────────────

export async function getActiveProductsForSelect() {
  return db.product.findMany({
    where: { isActive: true },
    include: { physical: true },
    orderBy: { name: "asc" },
  })
}

export async function getActiveCustomersForSelect() {
  return db.customer.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })
}

export async function getSuppliers() {
  return db.supplier.findMany({ orderBy: { name: "asc" } })
}

// ─── Transport analytics ──────────────────────────────────────────────────────

export async function getProductTransportHistory(productId: string) {
  return db.shipmentLine.findMany({
    where: { productId, shipment: { legType: "IMPORT" } },
    include: {
      shipment: {
        select: { code: true, shipmentDate: true, carrier: true, routeFrom: true, routeTo: true },
      },
    },
    orderBy: { shipment: { shipmentDate: "desc" } },
  })
}

export async function getCustomerDetail(id: string) {
  const [customer, overheadRate] = await Promise.all([
    db.customer.findUnique({
      where: { id },
      include: {
        pricing: {
          where: { validTo: null },
          include: { product: true },
          orderBy: { netNetPrice: "desc" },
        },
      },
    }),
    db.overheadRate.findFirst({ orderBy: { fiscalYear: "desc" } }),
  ])
  if (!customer) return null
  const productIds = customer.pricing.map((p) => p.productId)
  if (productIds.length === 0) return { customer, overheadRate, importLines: [], distribLines: [] }
  const [importLines, distribLines] = await Promise.all([
    db.shipmentLine.findMany({
      where: { productId: { in: productIds }, shipment: { legType: "IMPORT" } },
      select: { productId: true, allocatedCostEur: true, quantityUnits: true },
    }),
    db.shipmentLine.findMany({
      where: { productId: { in: productIds }, customerId: id, shipment: { legType: "DISTRIBUTION" } },
      select: { productId: true, allocatedCostEur: true, quantityUnits: true },
    }),
  ])
  return { customer, overheadRate, importLines, distribLines }
}

export async function getPricings(
  customerId?: string,
  productId?: string,
  includeExpired = false
) {
  const [pricings, overheadRate] = await Promise.all([
    db.customerPricing.findMany({
      where: {
        ...(includeExpired ? {} : { validTo: null }),
        ...(customerId && { customerId }),
        ...(productId && { productId }),
      },
      include: { customer: true, product: true },
      orderBy: [{ customer: { name: "asc" } }, { product: { name: "asc" } }, { validFrom: "desc" }],
    }),
    db.overheadRate.findFirst({ orderBy: { fiscalYear: "desc" } }),
  ])
  return { pricings, overheadRate }
}

export async function getPricingById(id: string) {
  return db.customerPricing.findUnique({
    where: { id },
    include: { customer: true, product: true },
  })
}

export async function getTransportImpact() {
  const [products, pricings, importLines, distribLines, overheadRate, shipments] = await Promise.all([
    db.product.findMany({ where: { isActive: true }, include: { supplier: true }, orderBy: { name: "asc" } }),
    db.customerPricing.findMany({ where: { validTo: null }, include: { customer: true, product: true } }),
    db.shipmentLine.findMany({
      where: { shipment: { legType: "IMPORT" } },
      select: { productId: true, allocatedCostEur: true, quantityUnits: true },
    }),
    db.shipmentLine.findMany({
      where: { shipment: { legType: "DISTRIBUTION" }, customerId: { not: null } },
      select: { productId: true, customerId: true, allocatedCostEur: true, quantityUnits: true },
    }),
    db.overheadRate.findFirst({ orderBy: { fiscalYear: "desc" } }),
    db.shipment.findMany({
      select: { shipmentDate: true, legType: true, totalCostEur: true },
      orderBy: { shipmentDate: "asc" },
    }),
  ])
  return { products, pricings, importLines, distribLines, overheadRate, shipments }
}
