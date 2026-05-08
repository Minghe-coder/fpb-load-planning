"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteOrder } from "@/lib/actions/order"
import { Trash2, Loader2 } from "lucide-react"

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
      <span className="text-xs text-red-700">Eliminare?</span>
      <button
        onClick={() => startTransition(async () => { await deleteOrder(orderId); router.push("/ordini") })}
        disabled={isPending}
        className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sì"}
      </button>
      <button onClick={() => setConfirm(false)} className="text-xs text-slate-500 hover:text-slate-700">No</button>
    </div>
  )
}
