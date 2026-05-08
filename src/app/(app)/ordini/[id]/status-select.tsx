"use client"

import { useTransition } from "react"
import { updateOrderStatus } from "@/lib/actions/order"
import { Loader2 } from "lucide-react"

const STATUSES = [
  { value: "PENDING", label: "In attesa" },
  { value: "IN_PREPARATION", label: "In preparazione" },
  { value: "READY", label: "Pronto" },
  { value: "SHIPPED", label: "Spedito" },
]

export function StatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="relative flex items-center">
      {isPending && <Loader2 className="absolute left-2 h-3 w-3 animate-spin text-slate-400" />}
      <select
        value={currentStatus}
        onChange={(e) => startTransition(() => updateOrderStatus(orderId, e.target.value))}
        disabled={isPending}
        className={`rounded-lg border border-slate-200 bg-white py-2 pr-3 text-sm font-medium text-slate-700 focus:border-indigo-400 focus:outline-none disabled:opacity-60 transition-colors ${isPending ? "pl-7" : "pl-3"}`}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  )
}
