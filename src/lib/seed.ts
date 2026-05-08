/**
 * Seed iniziale — importa i dati dai CSV originali di FPB.
 * Eseguire con: npm run db:seed
 *
 * Ordine di esecuzione:
 *   1. OverheadRate (dal Conto Economico)
 *   2. Supplier + Product (da Input dati Prodotti)
 *   3. Customer + CustomerPricing (da Condizioni Commerciali)
 *   4. PalletConfig default
 *   5. AppSetting defaults
 */

import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"
import Papa from "papaparse"
import Decimal from "decimal.js"

const db = new PrismaClient()

// ─── Percorsi CSV (modifica se necessario) ───────────────────────────────────

const CSV_DIR = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "Downloads"
)

function csvPath(name: string) {
  return path.join(CSV_DIR, `Calcolo margini FPB - ${name}.csv`)
}

// ─── Parser CSV generico ─────────────────────────────────────────────────────

function parseCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8")
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  return result.data
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Pulisce un valore Euro come "€ 1,68" o "1.68" → Decimal */
function parseEuro(raw: string | undefined): Decimal {
  if (!raw) return new Decimal(0)
  const clean = raw.replace(/[€\s]/g, "").replace(",", ".")
  return new Decimal(clean || "0")
}

/** Pulisce una percentuale come "26,64%" → Decimal (0.2664) */
function parsePct(raw: string | undefined): Decimal {
  if (!raw) return new Decimal(0)
  const clean = raw.replace(/[%\s]/g, "").replace(",", ".")
  return new Decimal(clean || "0").div(100)
}

/** Estrae le unità per cartone dal nome prodotto: "(12PZ/CRT)" → 12 */
function extractUnitsPerCarton(name: string): number | null {
  const m = name.match(/\((\d+)\s*PZ[/\s]/i)
  return m ? parseInt(m[1], 10) : null
}

/** Pulisce il nome prodotto rimuovendo le info di pack tra parentesi */
function cleanProductName(raw: string): string {
  return raw
    .replace(/\s*\([^)]*(?:PZ|CRT|CT|DISPLAY)[^)]*\)\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Calcola Net Net Price dalla formula corretta */
function computeNNP(
  grossPrice: Decimal,
  d1: Decimal,
  d2: Decimal,
  d3: Decimal,
  contrPct: Decimal,
  promoPct: Decimal,
  activPct: Decimal,
  listingPct: Decimal,
  commissionPct: Decimal
): Decimal {
  const afterDiscounts = grossPrice.minus(d1).minus(d2).minus(d3)
  const totalPct = contrPct
    .plus(promoPct)
    .plus(activPct)
    .plus(listingPct)
    .plus(commissionPct)
  return afterDiscounts.times(new Decimal(1).minus(totalPct))
}

// ─── Seed steps ──────────────────────────────────────────────────────────────

async function seedOverheadRates() {
  console.log("→ OverheadRate...")
  await db.overheadRate.upsert({
    where: { fiscalYear: 2024 },
    update: {},
    create: {
      fiscalYear: 2024,
      ratePct: "0.2664",
      revenueEur: "2397305",
      totalCostEur: "2295191",
      notes: "Dal Conto Economico 2024",
    },
  })
  await db.overheadRate.upsert({
    where: { fiscalYear: 2025 },
    update: {},
    create: {
      fiscalYear: 2025,
      ratePct: "0.2128",
      notes: "Conto Economico 2025 YTD (al 31 agosto)",
    },
  })
}

async function seedProductsAndSuppliers() {
  console.log("→ Supplier + Product...")
  const rows = parseCsv(csvPath("Input dati Prodotti"))

  const seenSkus = new Set<string>()

  for (const row of rows) {
    const sku = row["Codice Prodotto"]?.trim()
    if (!sku) continue
    if (seenSkus.has(sku)) {
      console.warn(`  ⚠ SKU duplicato ignorato: ${sku} — "${row["Nome Prodotto"]?.trim()}"`)
      continue
    }
    seenSkus.add(sku)

    const supplierCode = row["Codice fornitore"]?.trim()
    const supplierName = row["Fornitore"]?.trim()

    if (!supplierCode || !supplierName) continue

    // Upsert supplier
    await db.supplier.upsert({
      where: { code: supplierCode },
      update: { name: supplierName },
      create: { code: supplierCode, name: supplierName },
    })

    const rawName = row["Nome Prodotto"]?.trim() ?? ""
    const cleanedName = cleanProductName(rawName)
    const unitsPerCarton = extractUnitsPerCarton(rawName)
    const purchasePrice = parseEuro(row["Prezzo d'acquisto al fornitore (€(u)"])
    const marketingCredit = parseEuro(row["Credito per Marketing (€/u)"])

    // Inferisci categoria food dallo SKU/nome (semplificazione iniziale)
    const foodCategory = inferFoodCategory(rawName, sku)
    const fragilityClass = inferFragilityClass(foodCategory)

    await db.product.upsert({
      where: { sku },
      update: {
        name: cleanedName,
        purchasePrice: purchasePrice.toFixed(4),
        marketingCredit: marketingCredit.toFixed(4),
        unitsPerCarton,
        foodCategory,
        fragilityClass,
      },
      create: {
        sku,
        name: cleanedName,
        supplierId: (await db.supplier.findUniqueOrThrow({ where: { code: supplierCode } })).id,
        purchasePrice: purchasePrice.toFixed(4),
        marketingCredit: marketingCredit.toFixed(4),
        unitsPerCarton,
        foodCategory,
        fragilityClass,
      },
    })
  }
}

async function seedCustomersAndPricing() {
  console.log("→ Customer + CustomerPricing...")
  const rows = parseCsv(csvPath("Condizioni Commerciali"))

  for (const row of rows) {
    const customerName = row["Cliente"]?.trim()
    const sku = row["Codice prodotto"]?.trim()
    if (!customerName || !sku) continue

    // Upsert customer
    const customer = await db.customer.upsert({
      where: { name: customerName },
      update: {},
      create: { name: customerName, type: inferCustomerType(customerName) },
    })

    // Trova il prodotto
    const product = await db.product.findUnique({ where: { sku } })
    if (!product) {
      console.warn(`  ⚠ Prodotto non trovato per SKU "${sku}" (cliente ${customerName})`)
      continue
    }

    const grossPrice = parseEuro(row["Prezzo di vendita al cliente (€/u)"])
    const d1 = parseEuro(row["Sconto 1 (€)"])
    const d2 = parseEuro(row["Sconto 2 (€)"])
    const d3 = parseEuro(row["Sconto 3 (€)"])
    const contrPct = parsePct(row["Contributi contrattuali (%)"])
    const promoPct = parsePct(row["Contributi promozionali (%)"])
    const activPct = parsePct(row["Attività promozionali (%)"])
    const listingPct = parsePct(row["Listing fee allocata (%)"])
    const nnp = computeNNP(grossPrice, d1, d2, d3, contrPct, promoPct, activPct, listingPct, new Decimal(0))

    // Upsert pricing (same customer+product+validFrom = today seed)
    const existingPricing = await db.customerPricing.findFirst({
      where: { customerId: customer.id, productId: product.id, validTo: null },
    })

    if (!existingPricing) {
      await db.customerPricing.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          grossPrice: grossPrice.toFixed(4),
          discount1: d1.toFixed(4),
          discount2: d2.toFixed(4),
          discount3: d3.toFixed(4),
          contractualContribPct: contrPct.toFixed(6),
          promotionalContribPct: promoPct.toFixed(6),
          promotionalActivitiesPct: activPct.toFixed(6),
          listingFeePct: listingPct.toFixed(6),
          netNetPrice: nnp.toFixed(4),
        },
      })
    }
  }
}

async function seedDefaults() {
  console.log("→ PalletConfig + AppSetting...")

  await db.palletConfig.upsert({
    where: { name: "EUR Standard" },
    update: {},
    create: {
      name: "EUR Standard",
      lengthCm: 120,
      widthCm: 80,
      maxHeightCm: 180,
      maxWeightKg: 800,
      isDefault: true,
    },
  })

  const defaults = [
    { key: "fiscal_year_active", value: "2025" },
    { key: "default_volumetric_coeff", value: "250" },
    { key: "pallet_config_default", value: "EUR Standard" },
  ]
  for (const s of defaults) {
    await db.appSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }
}

// ─── Inferenza categoria (semplificata — da revisionare manualmente) ──────────

function inferFoodCategory(name: string, sku: string): string {
  const n = name.toUpperCase()
  if (n.includes("VASO") || n.includes("VETRO") || n.includes("JALAP") || n.includes("GINGER")) return "GLASS"
  if (n.includes("SODA") || n.includes("TONIC") || n.includes("WATER")) return "LIQUID"
  if (n.includes("SALSA") || n.includes("SAUCE") || n.includes("MAYO") || n.includes("RANCH") ||
      n.includes("GUACAMOLE") || n.includes("CHEDDAR") || n.includes("MISO PASTE")) return "LIQUID"
  return "DRY"
}

function inferFragilityClass(foodCategory: string): number {
  if (foodCategory === "GLASS") return 2      // vetro: centro (non schiacciato, non in cima se pesante)
  if (foodCategory === "PERISHABLE") return 3 // deperibile: sempre in cima
  if (foodCategory === "LIQUID") return 1     // liquidi PET: robusti, possono stare alla base
  return 1                                    // secco: base
}

function inferCustomerType(name: string): string {
  const n = name.toUpperCase()
  if (["ESSELUNGA", "MIGROSS", "METRO", "LIDL", "BENNET", "MAXI DÌ",
       "ROSSETTO", "TOSANO", "UNICOMM", "SCELGO", "MD", "SOGEGROSS",
       "SPAZIO CONAD"].some((g) => n.includes(g))) return "GDO"
  return "RETAIL"
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log("→ Pulizia DB...")
  await db.productPriceHistory.deleteMany()
  await db.shipmentLine.deleteMany()
  await db.shipment.deleteMany()
  await db.customerPricing.deleteMany()
  await db.productPhysical.deleteMany()
  await db.product.deleteMany()
  await db.customer.deleteMany()
  await db.supplier.deleteMany()
  await db.overheadRate.deleteMany()
  await db.palletConfig.deleteMany()
  await db.appSetting.deleteMany()
}

async function main() {
  console.log("🌱 Seed FPB in corso...\n")

  await cleanup()
  await seedOverheadRates()
  await seedProductsAndSuppliers()
  await seedCustomersAndPricing()
  await seedDefaults()

  console.log("\n✅ Seed completato.")

  const [products, customers, pricing] = await Promise.all([
    db.product.count(),
    db.customer.count(),
    db.customerPricing.count(),
  ])
  console.log(`   Prodotti: ${products}`)
  console.log(`   Clienti: ${customers}`)
  console.log(`   Righe listino: ${pricing}`)
}

main()
  .catch((e) => { console.error("❌ Seed fallito:", e); process.exit(1) })
  .finally(() => db.$disconnect())
