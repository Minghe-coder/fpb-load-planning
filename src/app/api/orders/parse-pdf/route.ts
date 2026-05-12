import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Nessun file" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse")
  const data = await pdfParse(buffer)
  const text: string = data.text

  const products = await db.product.findMany({
    where: { isActive: true },
    select: { id: true, sku: true, name: true },
  })

  const format = detectFormat(text)
  let lines: ParsedLine[]
  let meta: ParsedMeta | undefined

  if (format === "METRO") {
    const result = parseMetroFormat(text, products)
    lines = result.lines
    meta = result.meta
  } else {
    lines = parseGenericLines(text, products)
  }

  return NextResponse.json({ rawText: text.slice(0, 2000), lines, pageCount: data.numpages, meta })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductRow = { id: string; sku: string; name: string }

type ParsedLine = {
  productId: string | null
  sku: string
  productName: string
  quantityOrdered: number
  confidence: "exact" | "fuzzy" | "none"
  matchedProduct: { id: string; sku: string; name: string } | null
}

type ParsedMeta = {
  format: string
  orderNumber?: string
  requestedDate?: string  // YYYY-MM-DD
  customerName?: string
}

// ─── Format detection ─────────────────────────────────────────────────────────

function detectFormat(text: string): "METRO" | "GENERIC" {
  if (text.includes("RICHIESTA ORDINE") && text.includes("Prz. Netto")) return "METRO"
  return "GENERIC"
}

// ─── METRO parser ─────────────────────────────────────────────────────────────
// Layout: 2-column PDF → pdf-parse interleaves lines from both columns.
// Each product block in the text stream looks like:
//   ...336.00\nSO001 Prz. Netto\nTrade unit\nITF14\nCL150 SIFONE SODA WATER SIFO\n...
// Cod. forn. (SO001) is our internal SKU; it always precedes "Prz. Netto" on the same line.

function parseMetroFormat(
  text: string,
  products: ProductRow[]
): { meta: ParsedMeta; lines: ParsedLine[] } {
  const rows = text.split("\n").map((l) => l.trim()).filter(Boolean)

  // ── Header ────────────────────────────────────────────────────────────────
  const orderNumMatch = text.match(/n[°º]\s*(\d{6,})/)
  const deliveryMatch = text.match(/consegna\s+(\d{2}-\d{2}-\d{4})/i)

  let requestedDate: string | undefined
  if (deliveryMatch) {
    const [d, m, y] = deliveryMatch[1].split("-")
    requestedDate = `${y}-${m}-${d}`
  }

  // Company name: first line that looks like "Xxx Xxx S.p.A." / "Xxx S.r.l." etc.
  let customerName: string | undefined
  for (const row of rows) {
    if (/^[A-Z][A-Za-zÀ-ÿ\s.]+(?:S\.p\.A|S\.r\.l|SpA|Srl|S\.A\.)\.?$/.test(row)) {
      customerName = row
      break
    }
  }

  // ── Product lines ─────────────────────────────────────────────────────────
  const skuMap = new Map(products.map((p) => [p.sku.toLowerCase(), p]))
  const nameTokens = products.map((p) => ({
    product: p,
    tokens: p.name.toLowerCase().split(/\s+/).filter((t) => t.length > 3),
  }))

  const parsedLines: ParsedLine[] = []

  for (let i = 0; i < rows.length; i++) {
    // "SO001 Prz. Netto" or "SC001 Prz. Netto"
    const codFornMatch = rows[i].match(/^([A-Z]{1,3}\d{3,6})\s+Prz\.?\s*Netto/i)
    if (!codFornMatch) continue

    const rawSku = codFornMatch[1]

    // Quantity: scan back up to 8 rows for a standalone decimal number (e.g. "336.00")
    let qty = 0
    for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
      const m = rows[j].match(/^(\d+(?:[.,]\d+)?)$/)
      if (m) {
        qty = Math.round(parseFloat(m[1].replace(",", ".")))
        break
      }
    }

    // Description: after "ITF14" within the next 5 rows
    let desc = ""
    for (let j = i + 1; j < Math.min(rows.length, i + 6); j++) {
      if (rows[j] === "ITF14" && j + 1 < rows.length) {
        desc = rows[j + 1]
        break
      }
    }

    if (qty <= 0) continue

    // Match product
    const exactMatch = skuMap.get(rawSku.toLowerCase())
    if (exactMatch) {
      parsedLines.push({
        productId: exactMatch.id,
        sku: rawSku,
        productName: desc || rawSku,
        quantityOrdered: qty,
        confidence: "exact",
        matchedProduct: exactMatch,
      })
      continue
    }

    // Fuzzy name match on description
    const descLower = desc.toLowerCase()
    let bestScore = 0
    let bestProduct: ProductRow | null = null
    for (const { product, tokens } of nameTokens) {
      const score = tokens.filter((t) => descLower.includes(t)).length
      if (score > bestScore) { bestScore = score; bestProduct = product }
    }

    parsedLines.push({
      productId: bestScore >= 2 ? (bestProduct?.id ?? null) : null,
      sku: rawSku,
      productName: desc || rawSku,
      quantityOrdered: qty,
      confidence: bestScore >= 2 ? "fuzzy" : "none",
      matchedProduct: bestScore >= 2 ? bestProduct : null,
    })
  }

  return {
    meta: {
      format: "METRO",
      orderNumber: orderNumMatch?.[1],
      requestedDate,
      customerName,
    },
    lines: parsedLines,
  }
}

// ─── Generic parser (fallback) ────────────────────────────────────────────────

function parseGenericLines(text: string, products: ProductRow[]): ParsedLine[] {
  const results: ParsedLine[] = []
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

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

      const exactMatch = skuMap.get(rawSku.toLowerCase())
      if (exactMatch) {
        results.push({ productId: exactMatch.id, sku: rawSku, productName: rawName, quantityOrdered: qty, confidence: "exact", matchedProduct: exactMatch })
        break
      }

      const nameLower = rawName.toLowerCase()
      let bestScore = 0
      let bestProduct: ProductRow | null = null
      for (const { product, tokens } of nameTokens) {
        const score = tokens.filter((t) => nameLower.includes(t)).length
        if (score > bestScore) { bestScore = score; bestProduct = product }
      }

      results.push({
        productId: bestScore >= 2 ? (bestProduct?.id ?? null) : null,
        sku: rawSku,
        productName: rawName,
        quantityOrdered: qty,
        confidence: bestScore >= 2 ? "fuzzy" : "none",
        matchedProduct: bestScore >= 2 ? bestProduct : null,
      })
      break
    }
  }

  return results
}
