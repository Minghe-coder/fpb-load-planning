import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// pdf-parse ha bisogno di runtime node
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Nessun file" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  // Lazy import per evitare problemi SSR
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse")
  const data = await pdfParse(buffer)
  const text: string = data.text

  // Carica tutti i prodotti attivi per il matching
  const products = await db.product.findMany({
    where: { isActive: true },
    select: { id: true, sku: true, name: true },
  })

  const lines = parseLinesFromText(text, products)

  return NextResponse.json({
    rawText: text.slice(0, 2000), // preview troncata
    lines,
    pageCount: data.numpages,
  })
}

type ProductRow = { id: string; sku: string; name: string }
type ParsedLine = {
  productId: string | null
  sku: string
  productName: string
  quantityOrdered: number
  confidence: "exact" | "fuzzy" | "none"
  matchedProduct: { id: string; sku: string; name: string } | null
}

function parseLinesFromText(text: string, products: ProductRow[]): ParsedLine[] {
  const results: ParsedLine[] = []
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  // Pattern comune: SKU seguito da descrizione e quantità
  // Esempi: "AB123  Prodotto XYZ  24", "AB123 | Prodotto XYZ | 24 ctn"
  const patterns = [
    /^([A-Z0-9\-_]{3,20})\s+(.+?)\s+(\d+)\s*(?:ctn|ct|pz|pcs|box|colli?|cartoni?)?$/i,
    /^([A-Z0-9\-_]{3,20})[|\t;,](.+?)[|\t;,](\d+)/i,
  ]

  const skuMap = new Map(products.map((p) => [p.sku.toLowerCase(), p]))
  const nameTokens = products.map((p) => ({
    product: p,
    tokens: p.name.toLowerCase().split(/\s+/).filter((t) => t.length > 3),
  }))

  for (const line of lines) {
    for (const pattern of patterns) {
      const m = line.match(pattern)
      if (!m) continue

      const rawSku = m[1].trim()
      const rawName = m[2].trim()
      const qty = parseInt(m[3], 10)
      if (isNaN(qty) || qty <= 0) continue

      // 1. Exact SKU match
      const exactMatch = skuMap.get(rawSku.toLowerCase())
      if (exactMatch) {
        results.push({
          productId: exactMatch.id,
          sku: rawSku,
          productName: rawName,
          quantityOrdered: qty,
          confidence: "exact",
          matchedProduct: exactMatch,
        })
        break
      }

      // 2. Fuzzy name match
      const nameLower = rawName.toLowerCase()
      let bestScore = 0
      let bestProduct: ProductRow | null = null
      for (const { product, tokens } of nameTokens) {
        const score = tokens.filter((t) => nameLower.includes(t)).length
        if (score > bestScore) {
          bestScore = score
          bestProduct = product
        }
      }

      if (bestScore >= 2 && bestProduct) {
        results.push({
          productId: bestProduct.id,
          sku: rawSku,
          productName: rawName,
          quantityOrdered: qty,
          confidence: "fuzzy",
          matchedProduct: bestProduct,
        })
      } else {
        results.push({
          productId: null,
          sku: rawSku,
          productName: rawName,
          quantityOrdered: qty,
          confidence: "none",
          matchedProduct: null,
        })
      }
      break
    }
  }

  return results
}
