"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createOverheadRate } from "@/lib/actions/settings"
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react"

export function OverheadRateForm() {
  const [open, setOpen] = useState(false)
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()))
  const [ratePct, setRatePct] = useState("")
  const [revenueEur, setRevenueEur] = useState("")
  const [totalCostEur, setTotalCostEur] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Auto-calculate rate from revenue + cost
  const autoRate =
    revenueEur && totalCostEur && parseFloat(revenueEur) > 0
      ? ((parseFloat(totalCostEur) / parseFloat(revenueEur)) * 100).toFixed(4)
      : ""

  function submit() {
    setError(null)
    const rate = parseFloat(ratePct || autoRate)
    if (isNaN(rate) || rate <= 0) {
      setError("Inserisci un tasso overhead valido (o fatturato + costi per il calcolo automatico)")
      return
    }
    const year = parseInt(fiscalYear)
    if (isNaN(year)) {
      setError("Anno fiscale non valido")
      return
    }
    startTransition(async () => {
      const res = await createOverheadRate({
        fiscalYear: year,
        ratePct: rate / 100,
        revenueEur: revenueEur ? parseFloat(revenueEur) : undefined,
        totalCostEur: totalCostEur ? parseFloat(totalCostEur) : undefined,
        notes: notes || undefined,
      })
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setOpen(false)
        setFiscalYear(String(new Date().getFullYear()))
        setRatePct("")
        setRevenueEur("")
        setTotalCostEur("")
        setNotes("")
        setTimeout(() => setSuccess(false), 3000)
        router.refresh()
      }
    })
  }

  return (
    <div>
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Tasso overhead aggiunto con successo.
        </div>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <Plus className="h-4 w-4" /> Aggiungi anno fiscale
        </button>
      ) : (
        <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Nuovo tasso overhead</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Anno fiscale</label>
              <input
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                min="2020"
                max="2100"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tasso overhead (%)
                {autoRate && !ratePct && (
                  <button
                    type="button"
                    onClick={() => setRatePct(autoRate)}
                    className="ml-2 text-indigo-600 hover:underline"
                  >
                    Usa {autoRate}% calcolato
                  </button>
                )}
              </label>
              <input
                type="number"
                value={ratePct}
                onChange={(e) => setRatePct(e.target.value)}
                step="0.01"
                min="0"
                placeholder={autoRate ? `Auto: ${autoRate}%` : "es. 26.64"}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Optional: revenue + cost for auto-calculation */}
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 space-y-3">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Dati CE per calcolo automatico (opzionali)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Fatturato (€)</label>
                <input
                  type="number"
                  value={revenueEur}
                  onChange={(e) => setRevenueEur(e.target.value)}
                  min="0"
                  step="1000"
                  placeholder="es. 2500000"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Totale costi aziendali (€)</label>
                <input
                  type="number"
                  value={totalCostEur}
                  onChange={(e) => setTotalCostEur(e.target.value)}
                  min="0"
                  step="1000"
                  placeholder="es. 666000"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Note (opzionale)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. Approvato CDA marzo 2025"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={submit}
              disabled={isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Salvataggio…" : "Salva"}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null) }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
