"use client"

import { useState, useTransition } from "react"
import { createSupplier } from "@/lib/actions/supplier"
import { ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function NuovoFornitore() {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await createSupplier({ code, name, country: country || undefined })
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="p-8 max-w-lg">
      <Link href="/fornitori" className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
        <ArrowLeft className="h-3 w-3" /> Fornitori
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Nuovo fornitore</h1>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Codice *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="es. COOP-IT"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <p className="text-[11px] text-slate-400 mt-1">Codice univoco, verrà convertito in maiuscolo.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="es. Cooperativa Italia"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Paese (opzionale)</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="es. Italia, Francia…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={submit}
            disabled={isPending || !code || !name}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {isPending ? "Salvataggio…" : "Crea fornitore"}
          </button>
          <Link href="/fornitori" className="text-sm text-slate-500 hover:text-slate-700">
            Annulla
          </Link>
        </div>
      </div>
    </div>
  )
}
