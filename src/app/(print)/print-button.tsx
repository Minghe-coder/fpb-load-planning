"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: "#4f46e5", color: "white", border: "none", borderRadius: "8px",
        padding: "0.5rem 1.25rem", fontSize: "14px", fontWeight: "600", cursor: "pointer",
      }}
    >
      🖨 Stampa
    </button>
  )
}
