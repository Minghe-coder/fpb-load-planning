import { getSuppliers } from "@/lib/queries"
import { ProductForm } from "./product-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewProductPage() {
  const suppliers = await getSuppliers()

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/prodotti"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Prodotti
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
          Nuovo prodotto
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Inserisci i dati del prodotto. I dati fisici del cartone possono essere aggiunti in seguito.
        </p>
      </div>
      <ProductForm suppliers={suppliers} />
    </div>
  )
}
