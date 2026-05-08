import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { getTransportImpact } from "@/lib/queries"

export async function GET() {
  const { products, pricings, importLines, distribLines, overheadRate } = await getTransportImpact()
  const ratePct = Number(overheadRate?.ratePct ?? 0.2664)

  // ── Aggrega import per prodotto ──────────────────────────────────────────────
  const importByProduct = new Map<string, { cost: number; units: number }>()
  for (const l of importLines) {
    const cur = importByProduct.get(l.productId) ?? { cost: 0, units: 0 }
    importByProduct.set(l.productId, { cost: cur.cost + Number(l.allocatedCostEur), units: cur.units + l.quantityUnits })
  }

  // ── Aggrega distribuzione per cliente ────────────────────────────────────────
  const distribByCustomer = new Map<string, { cost: number; units: number; name: string; type: string }>()
  for (const l of distribLines) {
    if (!l.customerId) continue
    const pricing = pricings.find((p) => p.customerId === l.customerId)
    if (!pricing) continue
    const cur = distribByCustomer.get(l.customerId) ?? { cost: 0, units: 0, name: pricing.customer.name, type: pricing.customer.type }
    distribByCustomer.set(l.customerId, { ...cur, cost: cur.cost + Number(l.allocatedCostEur), units: cur.units + l.quantityUnits })
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = "FPB Load Planning"
  wb.created = new Date()

  // ── Sheet 1: Per SKU ─────────────────────────────────────────────────────────
  const wsSku = wb.addWorksheet("Impatto per SKU")
  wsSku.columns = [
    { header: "SKU", key: "sku", width: 12 },
    { header: "Prodotto", key: "product", width: 38 },
    { header: "Categoria", key: "category", width: 14 },
    { header: "Fornitore", key: "supplier", width: 24 },
    { header: "Costo acquisto (€)", key: "purchasePrice", width: 18 },
    { header: "Costo industriale (€)", key: "indCost", width: 20 },
    { header: "Import/pz (€)", key: "importPerUnit", width: 14 },
    { header: "% su NNP", key: "transportImpactPct", width: 12 },
    { header: "NNP medio (€)", key: "avgNnp", width: 15 },
    { header: "Margine comm. (%)", key: "commercialMargin", width: 18 },
    { header: "Margine reale (%)", key: "realMargin", width: 17 },
    { header: "Δ Margine (pp)", key: "delta", width: 15 },
  ]

  styleHeader(wsSku)

  const skuRows = products.map((product) => {
    const productPricings = pricings.filter((p) => p.productId === product.id)
    const avgNnp = productPricings.length
      ? productPricings.reduce((s, p) => s + Number(p.netNetPrice), 0) / productPricings.length
      : 0
    const imp = importByProduct.get(product.id)
    const importPerUnit = imp && imp.units > 0 ? imp.cost / imp.units : 0
    const indCost = Number(product.purchasePrice) * (1 + ratePct)
    const commercialMargin = avgNnp > 0 ? ((avgNnp - indCost) / avgNnp) * 100 : 0
    const realMargin = avgNnp > 0 ? ((avgNnp - indCost - importPerUnit) / avgNnp) * 100 : 0
    const delta = realMargin - commercialMargin
    const transportImpactPct = avgNnp > 0 ? (importPerUnit / avgNnp) * 100 : 0
    return { product, avgNnp, indCost, importPerUnit, commercialMargin, realMargin, delta, transportImpactPct }
  }).sort((a, b) => a.delta - b.delta)

  for (const r of skuRows) {
    const row = wsSku.addRow({
      sku: r.product.sku,
      product: r.product.name,
      category: r.product.foodCategory,
      supplier: r.product.supplier.name,
      purchasePrice: Number(r.product.purchasePrice),
      indCost: r.indCost,
      importPerUnit: r.importPerUnit > 0 ? r.importPerUnit : null,
      transportImpactPct: r.transportImpactPct > 0 ? r.transportImpactPct : null,
      avgNnp: r.avgNnp > 0 ? r.avgNnp : null,
      commercialMargin: r.avgNnp > 0 ? r.commercialMargin : null,
      realMargin: r.importPerUnit > 0 && r.avgNnp > 0 ? r.realMargin : null,
      delta: r.importPerUnit > 0 && r.avgNnp > 0 ? r.delta : null,
    })
    colorMarginCell(row.getCell("commercialMargin"), r.commercialMargin / 100)
    if (r.importPerUnit > 0) colorMarginCell(row.getCell("realMargin"), r.realMargin / 100)
    if (r.delta < -5) row.getCell("delta").font = { color: { argb: "FFDC2626" }, bold: true }
    else if (r.delta < -2) row.getCell("delta").font = { color: { argb: "FFD97706" } }
  }

  applyNumberFormats(wsSku, ["purchasePrice", "indCost", "importPerUnit", "avgNnp"], ["transportImpactPct", "commercialMargin", "realMargin", "delta"])
  wsSku.views = [{ state: "frozen", ySplit: 1 }]
  wsSku.autoFilter = { from: "A1", to: "L1" }

  // ── Sheet 2: Per Cliente ─────────────────────────────────────────────────────
  const wsCli = wb.addWorksheet("Impatto per Cliente")
  wsCli.columns = [
    { header: "Cliente", key: "customer", width: 32 },
    { header: "Tipo", key: "type", width: 12 },
    { header: "SKU attivi", key: "skuCount", width: 12 },
    { header: "Costo distrib. tot. (€)", key: "totalDistrib", width: 22 },
    { header: "Avg distrib/pz (€)", key: "avgDistrib", width: 18 },
    { header: "Margine comm. (%)", key: "commercialMargin", width: 18 },
    { header: "Margine reale (%)", key: "realMargin", width: 17 },
    { header: "Δ Margine (pp)", key: "delta", width: 15 },
  ]

  styleHeader(wsCli)

  const customerRows = Array.from(distribByCustomer.entries()).map(([customerId, d]) => {
    const customerPricings = pricings.filter((p) => p.customerId === customerId)
    const avgNnp = customerPricings.length
      ? customerPricings.reduce((s, p) => s + Number(p.netNetPrice), 0) / customerPricings.length
      : 0
    const avgDistrib = d.units > 0 ? d.cost / d.units : 0
    const avgImport = customerPricings.length
      ? customerPricings.reduce((s, p) => {
          const imp = importByProduct.get(p.productId)
          return s + (imp && imp.units > 0 ? imp.cost / imp.units : 0)
        }, 0) / customerPricings.length
      : 0
    const avgIndCost = customerPricings.length
      ? customerPricings.reduce((s, p) => s + Number(p.product.purchasePrice) * (1 + ratePct), 0) / customerPricings.length
      : 0
    const commercialMargin = avgNnp > 0 ? ((avgNnp - avgIndCost) / avgNnp) * 100 : 0
    const realMargin = avgNnp > 0 ? ((avgNnp - avgIndCost - avgImport - avgDistrib) / avgNnp) * 100 : 0
    return { name: d.name, type: d.type, skuCount: customerPricings.length, totalDistrib: d.cost, avgDistrib, commercialMargin, realMargin, delta: realMargin - commercialMargin }
  }).sort((a, b) => a.delta - b.delta)

  for (const r of customerRows) {
    const row = wsCli.addRow({
      customer: r.name,
      type: r.type,
      skuCount: r.skuCount,
      totalDistrib: r.totalDistrib,
      avgDistrib: r.avgDistrib,
      commercialMargin: r.commercialMargin,
      realMargin: r.realMargin,
      delta: r.delta,
    })
    colorMarginCell(row.getCell("commercialMargin"), r.commercialMargin / 100)
    colorMarginCell(row.getCell("realMargin"), r.realMargin / 100)
    if (r.delta < -5) row.getCell("delta").font = { color: { argb: "FFDC2626" }, bold: true }
    else if (r.delta < -2) row.getCell("delta").font = { color: { argb: "FFD97706" } }
  }

  applyNumberFormats(wsCli, ["totalDistrib", "avgDistrib"], ["commercialMargin", "realMargin", "delta"])
  wsCli.views = [{ state: "frozen", ySplit: 1 }]
  wsCli.autoFilter = { from: "A1", to: "H1" }

  const buffer = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().slice(0, 10)

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="FPB_Analisi_Trasporti_${today}.xlsx"`,
    },
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1)
  row.font = { bold: true, color: { argb: "FFFFFFFF" } }
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } }
  row.alignment = { vertical: "middle", horizontal: "center" }
  row.height = 20
}

function colorMarginCell(cell: ExcelJS.Cell, margin: number) {
  if (margin < 0) cell.font = { color: { argb: "FFDC2626" } }
  else if (margin < 0.1) cell.font = { color: { argb: "FFD97706" } }
  else cell.font = { color: { argb: "FF059669" } }
}

function applyNumberFormats(ws: ExcelJS.Worksheet, euroCols: string[], pctCols: string[]) {
  for (const col of ws.columns) {
    if (!col.key) continue
    if (euroCols.includes(col.key)) ws.getColumn(col.key).numFmt = '#,##0.0000 "€"'
    else if (pctCols.includes(col.key)) ws.getColumn(col.key).numFmt = '0.00"%"'
  }
}
