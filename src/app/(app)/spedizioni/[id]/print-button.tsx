"use client"

import { Printer } from "lucide-react"

interface Line {
  product: { name: string; sku: string }
  quantityCartons: number
  realWeightKg: string | number
  volumeM3: string | number
  effectiveWeightKg: string | number
  volumetricWeightKg: string | number
  allocatedCostEur: string | number
  allocatedCostPerUnitEur: string | number
  quantityUnits: number
  customer?: { name: string } | null
}

interface Shipment {
  code: string
  legType: string
  shipmentDate: string | Date
  carrier: string
  routeFrom: string
  routeTo: string
  totalCostEur: string | number
  volumetricCoefficient: string | number
  notes?: string | null
  lines: Line[]
}

function fmt(n: number, digits = 2) {
  return n.toLocaleString("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
function fmtEuro(n: number, digits = 2) { return "€ " + fmt(n, digits) }
function fmtKg(n: number) { return fmt(n, 2) + " kg" }
function fmtPct(n: number) { return fmt(n * 100, 1) + "%" }

function buildHTML(s: Shipment): string {
  const date = new Date(s.shipmentDate).toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  })
  const tipo = s.legType === "IMPORT" ? "Import" : "Distribuzione"
  const totalEff = s.lines.reduce((acc, l) => acc + Number(l.effectiveWeightKg), 0)
  const totalReal = s.lines.reduce((acc, l) => acc + Number(l.realWeightKg), 0)
  const totalVol = s.lines.reduce((acc, l) => acc + Number(l.volumeM3), 0)

  const rows = s.lines.map((l) => {
    const share = totalEff > 0 ? Number(l.effectiveWeightKg) / totalEff : 0
    const isVol = Number(l.volumetricWeightKg) > Number(l.realWeightKg)
    return `
      <tr>
        <td>${l.product.name}<br><small style="color:#6366f1;font-family:monospace">${l.product.sku}</small>${isVol ? ' <small style="color:#d97706">(vol.)</small>' : ""}</td>
        ${s.legType === "DISTRIBUTION" && l.customer ? `<td>${l.customer.name}</td>` : ""}
        <td style="text-align:center">${l.quantityCartons}</td>
        <td style="text-align:right">${fmtKg(Number(l.realWeightKg))}</td>
        <td style="text-align:right">${fmtKg(Number(l.effectiveWeightKg))}</td>
        <td style="text-align:right">${fmtPct(share)}</td>
        <td style="text-align:right;font-weight:600">${fmtEuro(Number(l.allocatedCostEur))}</td>
        <td style="text-align:right">${fmtEuro(Number(l.allocatedCostPerUnitEur), 4)}</td>
      </tr>`
  }).join("")

  const hasCustomer = s.legType === "DISTRIBUTION" && s.lines.some((l) => l.customer)
  const customerHeader = hasCustomer ? "<th>Cliente</th>" : ""

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Spedizione ${s.code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; }
    .logo { font-size: 16px; font-weight: 700; color: #4f46e5; }
    .meta { font-size: 10px; color: #64748b; text-align: right; }
    h1 { font-size: 20px; font-weight: 700; font-family: monospace; color: #0f172a; margin-bottom: 4px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;
      background: ${s.legType === "IMPORT" ? "#f5f3ff" : "#e0f2fe"};
      color: ${s.legType === "IMPORT" ? "#6d28d9" : "#0369a1"}; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 20px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
    .kpi-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
    .kpi-value { font-size: 15px; font-weight: 700; margin-top: 3px; color: #0f172a; }
    .kpi.accent { background: #eef2ff; border-color: #c7d2fe; }
    .kpi.accent .kpi-value { color: #4338ca; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead th { background: #f8fafc; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
      color: #64748b; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    tbody tr:last-child td { border-bottom: none; }
    .notes { margin-top: 16px; padding: 10px 14px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 10px; color: #64748b; }
    .footer { margin-top: 24px; font-size: 9px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">FPB Load Planning</div>
      <h1>${s.code}</h1>
      <span class="badge">${tipo}</span>
    </div>
    <div class="meta">
      <div>${date}</div>
      <div style="margin-top:4px">${s.carrier}</div>
      <div>${s.routeFrom} → ${s.routeTo}</div>
      <div style="margin-top:4px;color:#4f46e5;font-weight:600">Stampato il ${new Date().toLocaleDateString("it-IT")}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi accent"><div class="kpi-label">Costo totale</div><div class="kpi-value">${fmtEuro(Number(s.totalCostEur))}</div></div>
    <div class="kpi"><div class="kpi-label">Peso reale</div><div class="kpi-value">${fmtKg(totalReal)}</div></div>
    <div class="kpi"><div class="kpi-label">Volume</div><div class="kpi-value">${fmt(totalVol, 2)} m³</div></div>
    <div class="kpi"><div class="kpi-label">Righe</div><div class="kpi-value">${s.lines.length}</div></div>
    <div class="kpi"><div class="kpi-label">Coeff. vol.</div><div class="kpi-value">${Number(s.volumetricCoefficient)} kg/m³</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Prodotto</th>
        ${customerHeader}
        <th style="text-align:center">Cartoni</th>
        <th style="text-align:right">Peso reale</th>
        <th style="text-align:right">Ing. eff.</th>
        <th style="text-align:right">Share</th>
        <th style="text-align:right">Costo tot.</th>
        <th style="text-align:right">€/pezzo</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${s.notes ? `<div class="notes"><strong>Note:</strong> ${s.notes}</div>` : ""}
  <div class="footer">FPB Load Planning — generato automaticamente</div>
</body>
</html>`
}

export function PrintShipmentButton({ shipment }: { shipment: Shipment }) {
  function print() {
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(buildHTML(shipment))
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  return (
    <button
      onClick={print}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
    >
      <Printer className="h-3.5 w-3.5" /> PDF
    </button>
  )
}
