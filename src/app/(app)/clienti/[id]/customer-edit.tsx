"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateCustomer, deactivateCustomer, reactivateCustomer } from "@/lib/actions/customer"
import { Pencil, Check, X, Trash2, RotateCcw } from "lucide-react"

// Inline text edit
export function CustomerInlineEdit({
  id,
  field,
  value,
}: {
  id: string
  field: "name"
  value: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function cancel() { setVal(value); setError(null); setEditing(false) }
  function save() {
    setError(null)
    startTransition(async () => {
      const res = await updateCustomer({ id, [field]: val })
      if (res?.error) { setError(res.error) }
      else { setEditing(false); router.refresh() }
    })
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="group flex items-center gap-1.5 text-left">
        <span className="text-2xl font-semibold text-slate-900 tracking-tight">{value}</span>
        <Pencil className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel() }}
        autoFocus
        className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <button onClick={save} disabled={isPending} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={cancel} className="rounded p-1 text-slate-400 hover:bg-slate-100">
        <X className="h-4 w-4" />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

// Type select
export function CustomerTypeSelect({ id, value }: { id: string; value: string }) {
  const [type, setType] = useState(value)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const options = ["GDO", "RETAIL", "RESTAURANT", "ETHNIC"]
  const styles: Record<string, string> = {
    GDO: "bg-indigo-50 text-indigo-700 border-indigo-200",
    RETAIL: "bg-slate-100 text-slate-700 border-slate-200",
    RESTAURANT: "bg-amber-50 text-amber-700 border-amber-200",
    ETHNIC: "bg-violet-50 text-violet-700 border-violet-200",
  }

  function handleChange(newType: string) {
    setType(newType)
    startTransition(async () => {
      await updateCustomer({ id, type: newType })
      router.refresh()
    })
  }

  return (
    <select
      value={type}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className={`rounded-lg border px-3 py-1 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors ${styles[type] ?? styles.RETAIL}`}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

// Deactivate / Reactivate button with inline confirm
export function DeactivateCustomerButton({
  id,
  name,
  isActive,
}: {
  id: string
  name: string
  isActive: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function executeAction() {
    startTransition(async () => {
      if (isActive) {
        await deactivateCustomer(id)
      } else {
        await reactivateCustomer(id)
      }
    })
  }

  if (!isActive) {
    return (
      <button
        onClick={executeAction}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {isPending ? "…" : "Riattiva cliente"}
      </button>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600">Disattivare &ldquo;{name}&rdquo;?</span>
        <button
          onClick={executeAction}
          disabled={isPending}
          className="inline-flex items-center rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
        >
          {isPending ? "…" : "Sì, disattiva"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
        >
          Annulla
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Disattiva cliente
    </button>
  )
}
