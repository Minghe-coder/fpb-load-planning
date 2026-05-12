"use client"

import { useState, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createOrder } from "@/lib/actions/order"
import {
  Upload, FileText, AlertCircle, Plus, Trash2, Loader2,
  Package, CheckCircle2, XCircle, ChevronDown,
} from "lucide-react"

type Product = { id: string; sku: string; name: string; unitsPerCarton: number }
type Customer = { id: string; name: string }
type Supplier = { id: string; name: string }

type ParsedLine = {
  productId: string | null
  sku: string
  productName: string
  quantityOrdered: number
  confidence: "exact" | "fuzzy" | "none"
  matchedProduct: { id: string; sku: string; name: string } | null
}

type OrderLine = {
  productId: string
  quantityOrdered: number
  lotNumber?: string
  notes?: string
}

export function NewOrderForm({
  products,
  customers,
  suppliers,
}: {
  products: Product[]
  customers: Customer[]
  suppliers: Supplier[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Header fields
  const [type, setType] = useState<"OUTGOING" | "INCOMING">("OUTGOING")
  const [orderNumber, setOrderNumber] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [requestedDate, setRequestedDate] = useState("")
  const [notes, setNotes] = useState("")

  // Lines
  const [lines, setLines] = useState<OrderLine[]>([])

  // PDF import
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState("")
  const [parsedLines, setParsedLines] = useState<ParsedLine[] | null>(null)
  const [parseMeta, setParseMeta] = useState<{ format?: string; customerName?: string } | null>(null)
  const [sourceFile, setSourceFile] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState("")

  const productMap = new Map(products.map((p) => [p.id, p]))

  async function handleFile(file: File) {
    if (!file.type.includes("pdf")) {
      setParseError("Solo file PDF supportati")
      return
    }
    setParsing(true)
    setParseError("")
    setParsedLines(null)

    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/orders/parse-pdf", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Errore parsing")
      setSourceFile(file.name)
      setParsedLines(data.lines as ParsedLine[])
      if (data.meta) {
        setParseMeta(data.meta)
        if (data.meta.orderNumber && !orderNumber) setOrderNumber(data.meta.orderNumber)
        if (data.meta.requestedDate && !requestedDate) setRequestedDate(data.meta.requestedDate)
        if (data.meta.customerName && !customerId) {
          const keyword = data.meta.customerName.split(/\s+/)[0].toLowerCase()
          const match = customers.find((c) => c.name.toLowerCase().includes(keyword))
          if (match) setCustomerId(match.id)
        }
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Errore parsing PDF")
    } finally {
      setParsing(false)
    }
  }

  function importParsed() {
    if (!parsedLines) return
    const toImport: OrderLine[] = parsedLines
      .filter((l) => l.productId)
      .map((l) => ({ productId: l.productId!, quantityOrdered: l.quantityOrdered }))
    setLines((prev) => {
      const merged = [...prev]
      for (const l of toImport) {
        const ex = merged.findIndex((m) => m.productId === l.productId)
        if (ex >= 0) merged[ex] = { ...merged[ex], quantityOrdered: merged[ex].quantityOrdered + l.quantityOrdered }
        else merged.push(l)
      }
      return merged
    })
    setParsedLines(null)
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantityOrdered: 1 }])
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateLine(i: number, field: keyof OrderLine, value: string | number) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))
  }

  function handleSubmit() {
    setError("")
    if (lines.length === 0) { setError("Aggiungi almeno una riga prodotto"); return }
    if (lines.some((l) => !l.productId)) { setError("Seleziona un prodotto per ogni riga"); return }
    if (lines.some((l) => l.quantityOrdered <= 0)) { setError("Le quantità devono essere > 0"); return }

    startTransition(async () => {
      const res = await createOrder({
        orderNumber: orderNumber || undefined,
        type,
        customerId: customerId || undefined,
        supplierId: supplierId || undefined,
        requestedDate: requestedDate || undefined,
        notes: notes || undefined,
        sourceFile: sourceFile || undefined,
        lines,
      })
      if (res.error) { setError(res.error); return }
      router.push(`/ordini/${res.id}`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Type toggle */}
      <div className="flex gap-2">
        {(["OUTGOING", "INCOMING"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              type === t
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t === "OUTGOING" ? "🚚 Ordine in uscita (a cliente)" : "📦 Ordine in entrata (da fornitore)"}
          </button>
        ))}
      </div>

      {/* Header fields */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Dati ordine</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">N° Ordine</label>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="es. ORD-2026-001"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Data richiesta</label>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {type === "OUTGOING" && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Cliente</label>
              <div className="relative">
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">— Seleziona cliente —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          )}

          {type === "INCOMING" && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Fornitore</label>
              <div className="relative">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">— Seleziona fornitore —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          )}

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Note</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </div>
        </div>
      </div>

      {/* PDF import */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Importa da PDF</h2>
          <span className="text-xs text-slate-400">opzionale</span>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
          onClick={() => fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
            dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40"
          }`}
        >
          {parsing ? (
            <><Loader2 className="h-8 w-8 text-indigo-400 animate-spin" /><p className="text-sm text-slate-600">Analisi PDF in corso…</p></>
          ) : (
            <>
              <Upload className="h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-600">Trascina qui il PDF dell&apos;ordine o <span className="text-indigo-600 font-medium">sfoglia</span></p>
              <p className="text-xs text-slate-400">Solo file .pdf</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

        {parseMeta && (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
            <p className="text-xs text-indigo-700">
              Formato rilevato: <span className="font-semibold">{parseMeta.format}</span>
              {parseMeta.customerName && <> · Cliente: <span className="font-semibold">{parseMeta.customerName}</span></>}
            </p>
          </div>
        )}

        {parseError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{parseError}</p>
          </div>
        )}

        {parsedLines && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                <FileText className="inline h-4 w-4 mr-1 text-slate-400" />
                {parsedLines.length} righe trovate nel PDF
              </p>
              <button
                type="button"
                onClick={importParsed}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Importa righe abbinate
              </button>
            </div>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2 text-left font-medium text-slate-500">SKU nel PDF</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Descrizione</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">Qtà</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedLines.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-700">{l.sku}</td>
                      <td className="px-3 py-2 text-slate-600">{l.productName}</td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-900">{l.quantityOrdered}</td>
                      <td className="px-3 py-2">
                        {l.confidence === "exact" && (
                          <span className="flex items-center gap-1 text-green-700 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> {l.matchedProduct?.name}
                          </span>
                        )}
                        {l.confidence === "fuzzy" && (
                          <span className="flex items-center gap-1 text-amber-700">
                            <AlertCircle className="h-3 w-3" /> {l.matchedProduct?.name} (simile)
                          </span>
                        )}
                        {l.confidence === "none" && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <XCircle className="h-3 w-3" /> Non trovato
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Manual lines */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Prodotti
            {lines.length > 0 && (
              <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                {lines.length}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" /> Aggiungi riga
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
            <Package className="h-7 w-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nessuna riga aggiunta.<br />Importa dal PDF o aggiungi manualmente.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lines.map((line, i) => {
              const prod = productMap.get(line.productId)
              return (
                <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-start">
                  <div>
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(i, "productId", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">— Prodotto —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                      ))}
                    </select>
                    {prod && (
                      <p className="mt-1 px-1 text-[10px] text-slate-400">{prod.unitsPerCarton} pz/cartone</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      min={1}
                      value={line.quantityOrdered}
                      onChange={(e) => updateLine(i, "quantityOrdered", parseInt(e.target.value) || 1)}
                      placeholder="Qtà"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-center focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <p className="mt-1 px-1 text-[10px] text-slate-400">cartoni</p>
                  </div>
                  <input
                    value={line.lotNumber ?? ""}
                    onChange={(e) => updateLine(i, "lotNumber", e.target.value)}
                    placeholder="Lotto (opt.)"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button type="button" onClick={() => removeLine(i)} className="mt-0.5 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvataggio…</> : "Salva ordine"}
        </button>
      </div>
    </div>
  )
}
