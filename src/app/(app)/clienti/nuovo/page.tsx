"use client"

import { useState, useTransition } from "react"
import { createCustomer } from "@/lib/actions/customer"
import { ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"

const TYPES = [
  { value: "GDO", label: "GDO — Grande distribuzione organizzata" },
  { value: "RETAIL", label: "RETAIL — Negozio / Rivenditore" },
  { value: "RESTAURANT", label: "RESTAURANT — Ristorazione" },
  { value: "ETHNIC", label: "ETHNIC — Negozio etnico / specializzato" },
]

export default function NuovoClientePage() {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [type, setType] = useState("RETAIL")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createCustomer({ name, type })
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-8">
        <Link
          href="/clienti"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Clienti
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
          Nuovo cliente
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Dopo la creazione potrai aggiungere il listino prezzi dalla scheda cliente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome cliente *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. ESSELUNGA SpA"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tipo cliente
            </label>
            <div className="space-y-2">
              {TYPES.map((t) => (
                <label key={t.value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="type"
                    value={t.value}
                    checked={type === t.value}
                    onChange={() => setType(t.value)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                    {t.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href="/clienti" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Annulla
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Creazione…" : "Crea cliente"}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
