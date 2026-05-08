"use client"

import { useToastStore } from "@/lib/stores/toast"
import { CheckCircle2, XCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg pointer-events-auto animate-in slide-in-from-bottom-2 duration-200",
            t.type === "success" && "bg-white border-emerald-200 text-emerald-800",
            t.type === "error"   && "bg-white border-red-200 text-red-800",
            t.type === "info"    && "bg-white border-indigo-200 text-indigo-800"
          )}
        >
          {t.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
          {t.type === "error"   && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
          {t.type === "info"    && <Info className="h-4 w-4 text-indigo-500 shrink-0" />}
          {t.message}
          <button onClick={() => remove(t.id)} className="ml-1 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
