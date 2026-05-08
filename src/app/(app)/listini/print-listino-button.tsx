"use client"

import { Printer } from "lucide-react"

interface PricingRow {
  id: string
  customer: { name: string; type: string }
  product: { name: string; sku: string; purchasePrice: string | number }
  grossPrice: string | number
  discount1: string | number
  discount2: string | number
  discount3: string | number
  contractualContribPct: string | number
  promotionalContribPct: string | number
  promotionalActivitiesPct: string | number
  listingFeePct: string | number
  commissionPct: string | number
  netNetPrice: string | number
  validFrom: string | Date
}

function fmt(n: number, digits = 2) {
  return n.toLocaleString("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
function fmtEuro(n: number, digits = 2) { return "€ " + fmt(n, digits) }
function fmtPct(n: number) { return fmt(n * 100, 1) + "%" }

function buildListinoHTML(
  pricings: PricingRow[],
  ratePct: number,
  customerName?: string,
): string {
  const title = customerName ? `Listino prezzi — ${customerName}` : "Listino prezzi"
  const today = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })

  const grouped = new Map<string, PricingRow[]>()
  for (const p of pricings) {
    const key = p.customer.name
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(p)
  }

  const sections = Array.from(grouped.entries()).map(([name, rows]) => {
    const rowsHtml = rows.map((cp) => {
      const nnp = Number(cp.netNetPrice)
      const industrialCost = Number(cp.product.purchasePrice) * (1 + ratePct)
      const margin = nnp > 0 ? (nnp - industrialCost) / nnp : 0
      const totalDiscounts = Number(cp.discount1) + Number(cp.discount2) + Number(cp.discount3)
      const totalContribs =
        Number(cp.contractualContribPct) +
        Number(cp.promotionalContribPct) +
        Number(cp.promotionalActivitiesPct) +
        Number(cp.listingFeePct) +
        Number(cp.commissionPct)
      const marginColor = margin >= 0.35 ? "#059669" : margin >= 0.2 ? "#d97706" : "#dc2626"
      return `
        <tr>
          <td><span style="font-family:monospace;font-size:10px;color:#6366f1;background:#eef2ff;padding:1px 5px;border-radius:3px">${cp.product.sku}</span></td>
          <td>${cp.product.name}</td>
          <td style="text-align:right">${fmtEuro(Number(cp.grossPrice))}</td>
          <td style="text-align:right">${totalDiscounts > 0 ? fmtEuro(totalDiscounts) : "—"}</td>
          <td style="text-align:right">${totalContribs > 0 ? fmtPct(totalContribs) : "—"}</td>
          <td style="text-align:right;font-weight:700">${fmtEuro(nnp)}</td>
          <td style="text-align:right;font-weight:600;color:${marginColor}">${fmtPct(margin)}</td>
          <td style="text-align:right;font-size:10px;color:#94a3b8">${new Date(cp.validFrom).toLocaleDateString("it-IT")}</td>
        </tr>`
    }).join("")

    const sectionTitle = customerName ? "" : `
      <tr><td colspan="8" style="padding:14px 10px 6px;font-weight:700;font-size:12px;color:#1e293b;border-top:2px solid #e2e8f0;background:#f8fafc">
        ${name}
      </td></tr>`

    return sectionTitle + rowsHtml
  }).join("")

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #4f46e5; padding-bottom: 14px; }
    .logo { font-size: 13px; font-weight: 700; color: #4f46e5; margin-bottom: 4px; }
    h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
    .meta { font-size: 10px; color: #64748b; text-align: right; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #f8fafc; font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; color: #64748b; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child td { border-bottom: none; }
    .footer { margin-top: 24px; font-size: 9px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">FPB Load Planning</div>
      <h1>${title}</h1>
    </div>
    <div class="meta">
      <div>Data: ${today}</div>
      <div style="margin-top:4px">${pricings.length} condizioni attive</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Prodotto</th>
        <th style="text-align:right">Prezzo lordo</th>
        <th style="text-align:right">Sconti</th>
        <th style="text-align:right">Contributi</th>
        <th style="text-align:right">NNP</th>
        <th style="text-align:right">Margine</th>
        <th style="text-align:right">Attivo dal</th>
      </tr>
    </thead>
    <tbody>${sections}</tbody>
  </table>
  <div class="footer">FPB Load Planning — generato automaticamente il ${today}</div>
</body>
</html>`
}

export function PrintListinoButton({
  pricings,
  ratePct,
  customerName,
}: {
  pricings: PricingRow[]
  ratePct: number
  customerName?: string
}) {
  function print() {
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(buildListinoHTML(pricings, ratePct, customerName))
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  return (
    <button
      onClick={print}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
    >
      <Printer className="h-4 w-4" /> PDF
    </button>
  )
}
