"use client"

import { useState, useTransition } from "react"
import { createProduct } from "@/lib/actions/product"
import { AlertCircle } from "lucide-react"

interface Supplier {
  id: string
  name: string
  code: string
}

interface Props {
  suppliers: Supplier[]
}

const FOOD_CATEGORIES = [
  { value: "DRY", label: "Dry Food" },
  { value: "LIQUID", label: "Liquidi" },
  { value: "GLASS", label: "Vetro" },
  { value: "PERISHABLE", label: "Deperibile" },
]

const FRAGILITY_CLASSES = [
  { value: 1, label: "1 — Robusto (base pallet)" },
  { value: 2, label: "2 — Medio" },
  { value: 3, label: "3 — Fragile (solo in cima)" },
]

export function ProductForm({ suppliers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [sku, setSku] = useState("")
  const [name, setName] = useState("")
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [unitsPerCarton, setUnitsPerCarton] = useState("")
  const [foodCategory, setFoodCategory] = useState("DRY")
  const [fragilityClass, setFragilityClass] = useState(2)
  const [marketingCredit, setMarketingCredit] = useState("")
  const [notes, setNotes] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createProduct({
        sku,
        name,
        supplierId,
        purchasePrice: parseFloat(purchasePrice),
        unitsPerCarton: unitsPerCarton ? parseInt(unitsPerCarton) : undefined,
        foodCategory,
        fragilityClass,
        marketingCredit: marketingCredit ? parseFloat(marketingCredit) : undefined,
        notes: notes || undefined,
      })
      if (result?.error) setError(result.error)
      // on success, createProduct redirects server-side
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Identificazione */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Identificazione</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">SKU *</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="es. E0001"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome prodotto *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. WASABI PASTE 43g"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Fornitore *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className={inputCls}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Pezzi per cartone</label>
            <input
              type="number"
              min="1"
              step="1"
              value={unitsPerCarton}
              onChange={(e) => setUnitsPerCarton(e.target.value)}
              placeholder="es. 12"
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pricing</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Prezzo acquisto (€) *</label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="es. 3.5000"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Marketing credit (€)
              <span className="ml-1 text-slate-400 font-normal">opzionale</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={marketingCredit}
              onChange={(e) => setMarketingCredit(e.target.value)}
              placeholder="es. 0.05"
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Classificazione */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Classificazione</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoria food</label>
            <select
              value={foodCategory}
              onChange={(e) => setFoodCategory(e.target.value)}
              className={inputCls}
            >
              {FOOD_CATEGORIES.map((fc) => (
                <option key={fc.value} value={fc.value}>{fc.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Classe fragilità</label>
            <div className="flex flex-col gap-2">
              {FRAGILITY_CLASSES.map((fc) => (
                <label key={fc.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fragilityClass"
                    value={fc.value}
                    checked={fragilityClass === fc.value}
                    onChange={() => setFragilityClass(fc.value)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-slate-700">{fc.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Note <span className="text-slate-400 font-normal">opzionale</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Note interne sul prodotto…"
            className={`${inputCls} resize-none`}
          />
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <a
          href="/prodotti"
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Annulla
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Creazione…" : "Crea prodotto"}
        </button>
      </div>
    </form>
  )
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
