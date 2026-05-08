"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-red-50">
        <AlertTriangle className="h-7 w-7 text-red-500" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-900">Qualcosa è andato storto</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          {error.message || "Si è verificato un errore imprevisto. Riprova o contatta il supporto."}
        </p>
        {error.digest && (
          <p className="mt-1 text-[11px] text-slate-400 font-mono">#{error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        <RotateCcw className="h-4 w-4" /> Riprova
      </button>
    </div>
  )
}
