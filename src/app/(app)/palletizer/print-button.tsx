"use client"

import { FileDown } from "lucide-react"
import type { PalletizationResult } from "@/lib/engine/palletizer"

export function PrintPalletButton({ result }: { result: PalletizationResult }) {
  function openPrint() {
    const html = buildPrintHTML(result)
    const win = window.open("", "_blank", "width=800,height=900")
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  return (
    <button
      onClick={openPrint}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
    >
      <FileDown className="h-3.5 w-3.5" /> Stampa PDF
    </button>
  )
}

function buildPrintHTML(result: PalletizationResult): string {
  const pallets = result.pallets.map((p) => `
    <div class="pallet">
      <h2>Pallet ${p.palletNumber} — ${p.totalHeightCm} cm · ${p.totalWeightKg.toFixed(1)} kg · ${p.fillByVolumePct.toFixed(1)}% vol.</h2>
      <table>
        <thead>
          <tr>
            <th>Strato</th>
            <th>Prodotto</th>
            <th>Cartoni</th>
            <th>Griglia (L×l)</th>
            <th>H cumulata</th>
            <th>Posizione</th>
          </tr>
        </thead>
        <tbody>
          ${p.layers.map((l) => `
            <tr>
              <td>${l.layerNumber}</td>
              <td>${l.productName}</td>
              <td>${l.cartonsInLayer}</td>
              <td>${l.cartonsAlongLength}×${l.cartonsAlongWidth}</td>
              <td>${l.cumulativeHeightCm} cm</td>
              <td>${l.fragilityClass === 1 ? "Base" : l.fragilityClass === 2 ? "Centro" : "Cima"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `).join("")

  const warnings = result.warnings.length
    ? `<div class="warnings"><strong>⚠ Avvertenze:</strong><ul>${result.warnings.map((w) => `<li>${w}</li>`).join("")}</ul></div>`
    : ""

  const instructions = result.loadingInstructions.join("\n")

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>Istruzioni di carico — FPB Load Planning</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 16px; }
    header h1 { font-size: 16px; font-weight: 700; }
    header .meta { font-size: 10px; color: #64748b; text-align: right; }
    .summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; display: flex; gap: 32px; }
    .summary .stat label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    .summary .stat p { font-size: 14px; font-weight: 700; color: #1e293b; }
    .warnings { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; }
    .warnings ul { margin-top: 4px; padding-left: 16px; }
    .warnings li { margin-bottom: 2px; }
    .pallet { margin-bottom: 24px; page-break-inside: avoid; }
    .pallet h2 { font-size: 12px; font-weight: 700; background: #1e293b; color: white; padding: 6px 10px; border-radius: 4px 4px 0 0; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; padding: 5px 8px; border-bottom: 1px solid #cbd5e1; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: none; }
    .instructions { margin-top: 24px; border: 1px solid #e2e8f0; border-radius: 6px; }
    .instructions h3 { font-size: 11px; font-weight: 700; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; border-radius: 6px 6px 0 0; }
    .instructions pre { padding: 12px; font-size: 10px; line-height: 1.6; white-space: pre-wrap; font-family: 'Courier New', monospace; }
    @media print { body { padding: 12px; } .pallet { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <header>
    <h1>Istruzioni di carico pallet</h1>
    <div class="meta">
      FPB Load Planning<br/>
      ${new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
    </div>
  </header>
  <div class="summary">
    <div class="stat"><label>Pallet totali</label><p>${result.totalPallets}</p></div>
    <div class="stat"><label>Riempimento medio</label><p>${result.avgFillByVolumePct.toFixed(1)}%</p></div>
  </div>
  ${warnings}
  ${pallets}
  <div class="instructions">
    <h3>Sequenza di carico</h3>
    <pre>${instructions}</pre>
  </div>
</body>
</html>`
}
