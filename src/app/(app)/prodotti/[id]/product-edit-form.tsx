"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateProduct } from "@/lib/actions/product"
import { Pencil, Check, X } from "lucide-react"

interface SelectFieldProps {
  productId: string
  field: "foodCategory" | "fragilityClass" | "supplierId"
  currentValue: string | number
  options: { value: string; label: string }[]
}

export function ProductSelectField({ productId, field, currentValue, options }: SelectFieldProps) {
  const [value, setValue] = useState(String(currentValue))
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleChange(newVal: string) {
    setValue(newVal)
    startTransition(async () => {
      const parsed = field === "fragilityClass" ? parseInt(newVal) : newVal
      await updateProduct({ id: productId, [field]: parsed } as Parameters<typeof updateProduct>[0])
      router.refresh()
    })
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 cursor-pointer bg-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

interface Props {
  productId: string
  field: "name" | "purchasePrice" | "marketingCredit" | "unitsPerCarton" | "notes"
  currentValue: string | number
  label: string
  prefix?: string
  suffix?: string
  type?: "text" | "number"
  step?: string
  displayClassName?: string
  inputWidth?: string
}

export function InlineEditField({
  productId,
  field,
  currentValue,
  label,
  prefix,
  suffix,
  type = "number",
  step = "0.001",
  displayClassName = "font-semibold text-slate-900",
  inputWidth = "w-36",
}: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(currentValue))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function cancel() {
    setValue(String(currentValue))
    setError(null)
    setEditing(false)
  }

  function save() {
    setError(null)
    const parsed = type === "number" ? parseFloat(value) : value
    if (type === "number" && (isNaN(parsed as number) || (parsed as number) < 0)) {
      setError("Valore non valido")
      return
    }
    startTransition(async () => {
      const payload: Record<string, string | number> = { id: productId }
      payload[field] = parsed
      const res = await updateProduct(payload as unknown as Parameters<typeof updateProduct>[0])
      if (res?.error) {
        setError(res.error)
      } else {
        setEditing(false)
        router.refresh()
      }
    })
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1 text-left"
        title={`Modifica ${label}`}
      >
        <span className={displayClassName}>
          {prefix}{currentValue || <span className="text-slate-300 font-normal italic">non impostato</span>}{suffix}
        </span>
        <Pencil className="h-3 w-3 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      {prefix && <span className="text-xs text-slate-500">{prefix}</span>}
      <input
        type={type}
        step={step}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save()
          if (e.key === "Escape") cancel()
        }}
        autoFocus
        className={`${inputWidth} rounded border border-indigo-300 bg-white px-2 py-0.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100`}
      />
      {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
      <button
        onClick={save}
        disabled={isPending}
        className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
      >
        <Check className="h-4 w-4" />
      </button>
      <button onClick={cancel} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 transition-colors">
        <X className="h-4 w-4" />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
