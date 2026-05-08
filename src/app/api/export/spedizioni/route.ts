import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { db } from "@/lib/db"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export async function GET() {
  const shipments = await db.shipment.findMany({
    include: {
      lines: {
        include: { product: true, customer: true },
        orderBy: { effectiveWeightKg: "desc" },
      },
    },
    orderBy: { shipmentDate: "desc" },
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = "FPB Load Planning"
  wb.created = new Date()

  // ── Sheet 1: Riepilogo spedizioni ──
  const wsSum = wb.addWorksheet("Riepilogo spedizioni")
  wsSum.columns = [
    { header: "Codice", key: "code", width: 18 },
    { header: "Data", key: "date", width: 14 },
    { header: "Tipo", key: "legType", width: 14 },
    { header: "Da", key: "from", width: 20 },
    { header: "A", key: "to", width: 20 },
    { header: "Vettore", key: "carrier", width: 20 },
    { header: "Coeff. vol.", key: "volCoeff", width: 12 },
    { header: "Costo totale (€)", key: "totalCost", width: 18 },
    { header: "Peso reale (kg)", key: "realWeight", width: 16 },
    { header: "Peso tassabile (kg)", key: "taxableWeight", width: 20 },
    { header: "Volume (m³)", key: "volumeM3", width: 14 },
    { header: "N. righe", key: "lineCount", width: 10 },
    { header: "Note", key: "notes", width: 36 },
  ]

  const hRow = wsSum.getRow(1)
  hRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } }
  hRow.alignment = { vertical: "middle" }
  wsSum.views = [{ state: "frozen", ySplit: 1 }]
  wsSum.autoFilter = { from: "A1", to: "M1" }

  for (const s of shipments) {
    const totalCost = s.lines.reduce((sum, l) => sum + Number(l.allocatedCostEur), 0)
    const realWeight = s.lines.reduce((sum, l) => sum + Number(l.realWeightKg ?? 0), 0)
    const taxableWeight = s.lines.reduce((sum, l) => sum + Number(l.effectiveWeightKg ?? 0), 0)
    const volumeM3 = s.lines.reduce((sum, l) => sum + Number(l.volumeM3 ?? 0), 0)

    wsSum.addRow({
      code: s.code,
      date: format(new Date(s.shipmentDate), "dd/MM/yyyy", { locale: it }),
      legType: s.legType === "IMPORT" ? "Import" : "Distribuzione",
      from: s.routeFrom ?? "",
      to: s.routeTo ?? "",
      carrier: s.carrier ?? "",
      volCoeff: Number(s.volumetricCoefficient),
      totalCost,
      realWeight: realWeight.toFixed(2),
      taxableWeight: taxableWeight.toFixed(2),
      volumeM3: volumeM3.toFixed(3),
      lineCount: s.lines.length,
      notes: s.notes ?? "",
    })
  }

  // Number formats on the summary sheet
  const totalCostCol = wsSum.getColumn("totalCost")
  totalCostCol.numFmt = '#,##0.00 "€"'

  // ── Sheet 2: Righe spedizione ──
  const wsLines = wb.addWorksheet("Righe spedizioni")
  wsLines.columns = [
    { header: "Spedizione", key: "shipment", width: 18 },
    { header: "Data", key: "date", width: 14 },
    { header: "Tipo leg", key: "legType", width: 14 },
    { header: "SKU", key: "sku", width: 12 },
    { header: "Prodotto", key: "product", width: 36 },
    { header: "Cliente", key: "customer", width: 28 },
    { header: "Quantità (pz)", key: "qty", width: 14 },
    { header: "Peso reale (kg)", key: "realWeight", width: 16 },
    { header: "Volume (m³)", key: "volume", width: 14 },
    { header: "Peso tassabile (kg)", key: "effWeight", width: 20 },
    { header: "Costo allocato (€)", key: "allocCost", width: 20 },
    { header: "Costo/pz (€)", key: "costPerUnit", width: 14 },
  ]

  const hRow2 = wsLines.getRow(1)
  hRow2.font = { bold: true, color: { argb: "FFFFFFFF" } }
  hRow2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } }
  hRow2.alignment = { vertical: "middle" }
  wsLines.views = [{ state: "frozen", ySplit: 1 }]
  wsLines.autoFilter = { from: "A1", to: "L1" }

  for (const s of shipments) {
    for (const l of s.lines) {
      wsLines.addRow({
        shipment: s.code,
        date: format(new Date(s.shipmentDate), "dd/MM/yyyy", { locale: it }),
        legType: s.legType === "IMPORT" ? "Import" : "Distribuzione",
        sku: l.product.sku,
        product: l.product.name,
        customer: l.customer?.name ?? "—",
        qty: l.quantityUnits,
        realWeight: Number(l.realWeightKg ?? 0).toFixed(2),
        volume: Number(l.volumeM3 ?? 0).toFixed(3),
        effWeight: Number(l.effectiveWeightKg ?? 0).toFixed(2),
        allocCost: Number(l.allocatedCostEur),
        costPerUnit: Number(l.allocatedCostPerUnitEur ?? 0),
      })
    }
  }

  wsLines.getColumn("allocCost").numFmt = '#,##0.000 "€"'
  wsLines.getColumn("costPerUnit").numFmt = '#,##0.0000 "€"'

  const buf = await wb.xlsx.writeBuffer()
  const dateStr = format(new Date(), "yyyy-MM-dd")

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="FPB_Spedizioni_${dateStr}.xlsx"`,
    },
  })
}
