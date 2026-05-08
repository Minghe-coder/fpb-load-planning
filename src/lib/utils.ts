import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("it-IT", options).format(value)
}

export function fmtEuro(value: number, decimals = 2): string {
  return fmt(value, { style: "currency", currency: "EUR", minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function fmtPct(value: number, decimals = 1): string {
  return fmt(value * 100, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + "%"
}

export function fmtKg(value: number): string {
  return fmt(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " kg"
}

export function marginColor(pct: number): string {
  if (pct >= 0.35) return "text-emerald-600"
  if (pct >= 0.25) return "text-blue-600"
  if (pct >= 0.15) return "text-amber-600"
  return "text-red-600"
}

export function marginBg(pct: number): string {
  if (pct >= 0.35) return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  if (pct >= 0.25) return "bg-blue-50 text-blue-700 ring-blue-200"
  if (pct >= 0.15) return "bg-amber-50 text-amber-700 ring-amber-200"
  return "bg-red-50 text-red-700 ring-red-200"
}

export function foodCategoryLabel(cat: string): string {
  return { DRY: "Secco", LIQUID: "Liquido", GLASS: "Vetro", PERISHABLE: "Deperibile" }[cat] ?? cat
}

export function foodCategoryColor(cat: string): string {
  return {
    DRY:        "bg-amber-50 text-amber-700 ring-amber-200",
    LIQUID:     "bg-blue-50 text-blue-700 ring-blue-200",
    GLASS:      "bg-purple-50 text-purple-700 ring-purple-200",
    PERISHABLE: "bg-green-50 text-green-700 ring-green-200",
  }[cat] ?? "bg-gray-100 text-gray-600 ring-gray-200"
}
