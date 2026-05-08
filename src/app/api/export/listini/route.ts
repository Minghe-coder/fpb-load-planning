import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { getPricings } from "@/lib/queries"

export async function GET() {
  const { pricings, overheadRate } = await getPricings()
  const ratePct = Number(overheadRate?.ratePct ?? 0.2664)

  const wb = new ExcelJS.Workbook()
  wb.creator = "FPB Load Planning"
  wb.created = new Date()

  const ws = wb.addWorksheet("Listini attivi")

  ws.columns = [
    { header: "Cliente", key: "customer", width: 32 },
    { header: "Tipo", key: "type", width: 12 },
    { header: "SKU", key: "sku", width: 12 },
    { header: "Prodotto", key: "product", width: 36 },
    { header: "Prezzo lordo (€)", key: "grossPrice", width: 16 },
    { header: "Sconto 1 (€)", key: "disc1", width: 13 },
    { header: "Sconto 2 (€)", key: "disc2", width: 13 },
    { header: "Sconto 3 (€)", key: "disc3", width: 13 },
    { header: "Tot. sconti (€)", key: "totalDisc", width: 14 },
    { header: "Contratt. (%)", key: "contractual", width: 13 },
    { header: "Promo. (%)", key: "promotional", width: 12 },
    { header: "Attività (%)", key: "activities", width: 12 },
    { header: "Listing fee (%)", key: "listing", width: 14 },
    { header: "Commissioni (%)", key: "commission", width: 15 },
    { header: "Tot. contributi (%)", key: "totalContrib", width: 18 },
    { header: "NNP (€)", key: "nnp", width: 12 },
    { header: "Costo ind. (€)", key: "indCost", width: 14 },
    { header: "Margine comm. (%)", key: "margin", width: 17 },
    { header: "Attivo dal", key: "validFrom", width: 14 },
  ]

  // Header style
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } }
  headerRow.alignment = { vertical: "middle", horizontal: "center" }
  headerRow.height = 20

  for (const cp of pricings) {
    const nnp = Number(cp.netNetPrice)
    const indCost = Number(cp.product.purchasePrice) * (1 + ratePct)
    const margin = nnp > 0 ? ((nnp - indCost) / nnp) * 100 : 0
    const disc1 = Number(cp.discount1)
    const disc2 = Number(cp.discount2)
    const disc3 = Number(cp.discount3)
    const totalDisc = disc1 + disc2 + disc3
    const c = Number(cp.contractualContribPct) * 100
    const p = Number(cp.promotionalContribPct) * 100
    const a = Number(cp.promotionalActivitiesPct) * 100
    const l = Number(cp.listingFeePct) * 100
    const cm = Number(cp.commissionPct) * 100

    const row = ws.addRow({
      customer: cp.customer.name,
      type: cp.customer.type,
      sku: cp.product.sku,
      product: cp.product.name,
      grossPrice: Number(cp.grossPrice),
      disc1, disc2, disc3, totalDisc,
      contractual: c, promotional: p, activities: a, listing: l, commission: cm,
      totalContrib: c + p + a + l + cm,
      nnp,
      indCost: Math.round(indCost * 10000) / 10000,
      margin: Math.round(margin * 100) / 100,
      validFrom: new Date(cp.validFrom).toLocaleDateString("it-IT"),
    })

    // Color margin cell
    const marginCell = row.getCell("margin")
    const m = margin / 100
    if (m < 0) marginCell.font = { color: { argb: "FFDC2626" } }
    else if (m < 0.1) marginCell.font = { color: { argb: "FFD97706" } }
    else marginCell.font = { color: { argb: "FF059669" } }
  }

  // Number formats
  const euroCols = ["grossPrice", "disc1", "disc2", "disc3", "totalDisc", "nnp", "indCost"]
  const pctCols = ["contractual", "promotional", "activities", "listing", "commission", "totalContrib", "margin"]
  for (const col of ws.columns) {
    if (!col.key) continue
    if (euroCols.includes(col.key)) {
      ws.getColumn(col.key).numFmt = '#,##0.0000 "€"'
    } else if (pctCols.includes(col.key)) {
      ws.getColumn(col.key).numFmt = '0.00"%"'
    }
  }

  // Freeze header + auto-filter
  ws.views = [{ state: "frozen", ySplit: 1 }]
  ws.autoFilter = { from: "A1", to: `S1` }

  const buffer = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().slice(0, 10)

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="FPB_Listini_${today}.xlsx"`,
    },
  })
}
