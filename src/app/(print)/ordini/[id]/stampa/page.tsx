import { notFound } from "next/navigation"
import { getOrderDetail } from "@/lib/queries"
import { PrintButton } from "@/app/(print)/print-button"

export default async function StampaOrdine({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrderDetail(id)
  if (!order) notFound()

  const displayNumber = order.orderNumber ?? `#${order.id.slice(-6).toUpperCase()}`
  const counterpart = order.customer?.name ?? order.supplier?.name ?? "—"
  const totalCartons = order.lines.reduce((s, l) => s + l.quantityOrdered, 0)
  const today = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })

  return (
    <div style={{ padding: "2cm", maxWidth: "21cm", margin: "0 auto" }}>

      {/* Print button */}
      <div className="no-print" style={{ marginBottom: "1.5rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <PrintButton />
        <a href={`/ordini/${id}`} style={{ fontSize: "13px", color: "#6366f1" }}>← Torna all&apos;ordine</a>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "2px solid #0f172a", paddingBottom: "0.75rem" }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>Lista Picking</div>
          <div style={{ fontSize: "18px", fontWeight: "700", marginTop: "4px" }}>{displayNumber}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: "13px", color: "#475569" }}>
          <div><strong>FPB</strong></div>
          <div>Stampato il {today}</div>
        </div>
      </div>

      {/* Dettagli ordine */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Cliente / Fornitore", value: counterpart },
          { label: "Tipo", value: order.type === "OUTGOING" ? "Uscita" : "Entrata" },
          { label: "Data richiesta", value: order.requestedDate ? new Date(order.requestedDate).toLocaleDateString("it-IT") : "—" },
        ].map(({ label, value }) => (
          <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.75rem" }}>
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "14px", fontWeight: "600" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Note */}
      {order.notes && (
        <div style={{ border: "1px solid #fcd34d", borderRadius: "8px", background: "#fffbeb", padding: "0.75rem", marginBottom: "1.5rem", fontSize: "13px" }}>
          <strong>Note:</strong> {order.notes}
        </div>
      )}

      {/* Tabella prodotti */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#0f172a", color: "white" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", width: "40px" }}>#</th>
            <th style={{ padding: "10px 12px", textAlign: "left" }}>Prodotto</th>
            <th style={{ padding: "10px 12px", textAlign: "left", width: "80px" }}>SKU</th>
            <th style={{ padding: "10px 12px", textAlign: "center", width: "80px" }}>Cartoni</th>
            <th style={{ padding: "10px 12px", textAlign: "left", width: "100px" }}>Lotto</th>
            <th style={{ padding: "10px 12px", textAlign: "center", width: "70px" }}>✓</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l, i) => (
            <tr key={l.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white", borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", fontWeight: "600" }}>{l.product.name}</td>
              <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>{l.product.sku}</td>
              <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: "800", fontSize: "16px" }}>{l.quantityOrdered}</td>
              <td style={{ padding: "10px 12px", color: "#64748b", fontSize: "12px" }}>{l.lotNumber ?? ""}</td>
              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                <div style={{ width: "24px", height: "24px", border: "2px solid #94a3b8", borderRadius: "4px", margin: "0 auto" }} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "#0f172a", color: "white" }}>
            <td colSpan={3} style={{ padding: "10px 12px", fontWeight: "700" }}>TOTALE</td>
            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: "800", fontSize: "16px" }}>{totalCartons}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>

      {/* Firma */}
      <div style={{ marginTop: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {["Preparato da", "Verificato da"].map((label) => (
          <div key={label} style={{ borderTop: "1px solid #334155", paddingTop: "0.5rem", fontSize: "12px", color: "#64748b" }}>
            {label}: ___________________________
          </div>
        ))}
      </div>
    </div>
  )
}
