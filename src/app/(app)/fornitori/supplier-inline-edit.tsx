"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateSupplier } from "@/lib/actions/supplier"
import { Pencil, Check, X } from "lucide-react"

interface Props {
  id: string
  field: "name" | "country"
  value: string
  placeholder?: string
}

export function SupplierInlineEdit({ id, field, value, placeholder = "—" }: Props) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function cancel() { setVal(value); setError(null); setEditing(false) }

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await updateSupplier({ id, [field]: val })
      if (res?.error) { setError(res.error) }
      else { setEditing(false); router.refresh() }
    })
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="group flex items-center gap-1 text-left">
        <span className={value ? "" : "text-slate-300"}>{value || placeholder}</span>
        <Pencil className="h-3 w-3 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel() }}
        autoFocus
        className="w-40 rounded border border-indigo-300 bg-white px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <button onClick={save} disabled={isPending} className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={cancel} className="rounded p-0.5 text-slate-400 hover:bg-slate-100">
        <X className="h-4 w-4" />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
