import { db } from "@/lib/db"
import { PalletizerWizard } from "./palletizer-wizard"
import { Layers } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PalletizerPage() {
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { physical: true },
    orderBy: { name: "asc" },
  })

  const productsForClient = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    foodCategory: p.foodCategory,
    fragilityClass: p.fragilityClass,
    physical: p.physical
      ? {
          grossWeightKg: Number(p.physical.grossWeightKg),
          lengthCm: Number(p.physical.lengthCm),
          widthCm: Number(p.physical.widthCm),
          heightCm: Number(p.physical.heightCm),
        }
      : null,
  }))

  return (
    <div className="flex flex-col gap-6 p-8 max-w-5xl">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-100 shrink-0">
          <Layers className="h-5 w-5 text-indigo-700" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Palletizer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Calcola la disposizione ottimale dei cartoni sul pallet, rispettando fragilità e densità.
          </p>
        </div>
      </div>

      <PalletizerWizard products={productsForClient} />
    </div>
  )
}
