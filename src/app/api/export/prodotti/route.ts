import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { db } from "@/lib/db"
import { format } from "date-fns"

const OVERHEAD_DEFAULT = 0.2664

export async function GET() {
  const [products, overheadRate, importLines] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      include: {
        supplier: true,
        physical: true,
        _count: { select: { customerPricing: { where: { validTo: null } } } },
      },
      orderBy: { name: "asc" },
    }),
    db.overheadRate.findFirst({ orderBy: { fiscalYear: "desc" } }),
    db.shipmentLine.findMany({
      where: { shipment: { legType: "IMPORT" } },
      select: { productId: true, allocatedCostEur: true, quantityUnits: true },
    }),
  ])

  const ratePct = Number(overheadRate?.ratePct ?? OVERHEAD_DEFAULT)

  // Aggregate import cost per product
  const importByProduct = new Map<string, { cost: number; units: number }>()
  for (const l of importLines) {
    const cur = importByProduct.get(l.productId) ?? { cost: 0, units: 0 }
    importByProduct.set(l.productId, {
      cost: cur.cost + Number(l.allocatedCostEur),
      units: cur.units + l.quantityUnits,
    })
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = "FPB Load Planning"
  wb.created = new Date()

  const ws = wb.addWorksheet("Prodotti")
  ws.columns = [
    { header: "SKU", key: "sku", width: 14 },
    { header: "Prodotto", key: "name", width: 40 },
    { header: "Fornitore", key: "supplier", width: 28 },
    { header: "Categoria", key: "category", width: 14 },
    { header: "Fragilità", key: "fragility", width: 12 },
    { header: "Prezzo acquisto (€)", key: "purchasePrice", width: 20 },
    { header: "Costo industriale (€)", key: "industrialCost", width: 22 },
    { header: "Trasporto import/pz (€)", key: "importCostPz", width: 24 },
    { header: "Costo arrivo/pz (€)", key: "landedCost", width: 22 },
    { header: "Pz/cartone", key: "unitsPerCarton", width: 12 },
    { header: "Marketing credit (€)", key: "marketingCredit", width: 20 },
    { header: "Peso cartone (kg)", key: "grossWeight", width: 18 },
    { header: "L×l×h (cm)", key: "dims", width: 16 },
    { header: "Volume (m³)", key: "volumeM3", width: 14 },
    { header: "Densità (kg/m³)", key: "density", width: 16 },
    { header: "Crt/strato", key: "cartonsPerLayer", width: 12 },
    { header: "Strati/pallet", key: "layersPerPallet", width: 14 },
    { header: "N. listini attivi", key: "pricingCount", width: 16 },
    { header: "Note", key: "notes", width: 36 },
  ]

  const hRow = ws.getRow(1)
  hRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } }
  hRow.alignment = { vertical: "middle" }
  ws.views = [{ state: "frozen", ySplit: 1 }]
  ws.autoFilter = { from: "A1", to: "S1" }

  const fragilityLabel: Record<number, string> = { 1: "Base", 2: "Centro", 3: "Cima" }
  const categoryLabel: Record<string, string> = {
    DRY: "Secco", LIQUID: "Liquido", GLASS: "Vetro", PERISHABLE: "Deperibile"
  }

  for (const p of products) {
    const purchasePrice = Number(p.purchasePrice)
    const industrialCost = purchasePrice * (1 + ratePct)
    const imp = importByProduct.get(p.id)
    const importCostPz = imp && imp.units > 0 ? imp.cost / imp.units : null
    const landedCost = importCostPz != null ? industrialCost + importCostPz : null

    const ph = p.physical
    let volumeM3: number | null = null
    let density: number | null = null
    if (ph) {
      const vol =
        (Number(ph.lengthCm) * Number(ph.widthCm) * Number(ph.heightCm)) / 1_000_000
      volumeM3 = vol
      density = vol > 0 ? Number(ph.grossWeightKg) / vol : null
    }

    const row = ws.addRow({
      sku: p.sku,
      name: p.name,
      supplier: p.supplier.name,
      category: categoryLabel[p.foodCategory] ?? p.foodCategory,
      fragility: fragilityLabel[p.fragilityClass] ?? String(p.fragilityClass),
      purchasePrice,
      industrialCost,
      importCostPz: importCostPz ?? "",
      landedCost: landedCost ?? "",
      unitsPerCarton: p.unitsPerCarton ?? "",
      marketingCredit: Number(p.marketingCredit),
      grossWeight: ph ? Number(ph.grossWeightKg) : "",
      dims: ph
        ? `${Number(ph.lengthCm)}×${Number(ph.widthCm)}×${Number(ph.heightCm)}`
        : "",
      volumeM3: volumeM3 != null ? volumeM3.toFixed(4) : "",
      density: density != null ? Math.round(density) : "",
      cartonsPerLayer: ph?.cartonsPerLayer ?? "",
      layersPerPallet: ph?.layersPerPallet ?? "",
      pricingCount: p._count.customerPricing,
      notes: p.notes ?? "",
    })

    // Color rows without physical data amber
    if (!ph) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }
    }
  }

  ws.getColumn("purchasePrice").numFmt = '#,##0.000 "€"'
  ws.getColumn("industrialCost").numFmt = '#,##0.000 "€"'
  ws.getColumn("importCostPz").numFmt = '#,##0.0000 "€"'
  ws.getColumn("landedCost").numFmt = '#,##0.000 "€"'
  ws.getColumn("marketingCredit").numFmt = '#,##0.000 "€"'

  const buf = await wb.xlsx.writeBuffer()
  const dateStr = format(new Date(), "yyyy-MM-dd")

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="FPB_Prodotti_${dateStr}.xlsx"`,
    },
  })
}
