/**
 * Arricchisce il DB reale con:
 *  1. Dati fisici realistici per tutti i 50 prodotti
 *  2. Aggiorna unitsPerCarton dove mancante
 *  3. Crea 10 spedizioni (6 IMPORT + 4 DISTRIBUTION) con clienti reali
 *
 * Eseguire DOPO npm run db:seed (che carica i prodotti dai CSV reali).
 * Comando: npx tsx src/lib/seed-physical-shipments.ts
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

function d(n: number | string) { return String(n) }

// ─── Allocazione costi (stessa logica dell'engine) ────────────────────────────

function allocate(
  lines: { sku: string; qty: number; custName?: string }[],
  physMap: Record<string, { kg: number; l: number; w: number; h: number; upc: number }>,
  totalCostEur: number,
  volumCoeff = 250
) {
  const computed = lines.map((ln) => {
    const ph = physMap[ln.sku]
    if (!ph) throw new Error(`Fisico mancante per SKU ${ln.sku}`)
    const realWeight = ph.kg * ln.qty
    const vol = (ph.l * ph.w * ph.h / 1_000_000) * ln.qty
    const volWeight = vol * volumCoeff
    const effWeight = Math.max(realWeight, volWeight)
    const units = ph.upc * ln.qty
    return { ...ln, realWeight, vol, volWeight, effWeight, units }
  })
  const totalEff = computed.reduce((s, c) => s + c.effWeight, 0)
  return computed.map((c) => {
    const allocCost = totalEff > 0 ? (c.effWeight / totalEff) * totalCostEur : 0
    return { ...c, allocCost, costPerUnit: c.units > 0 ? allocCost / c.units : 0 }
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧 Arricchimento DB con dati fisici + spedizioni...\n")

  // Carica tutti i prodotti dal DB
  const products = await db.product.findMany({ include: { physical: true } })
  const P = Object.fromEntries(products.map((p) => [p.sku, p]))

  const customers = await db.customer.findMany()
  const C = Object.fromEntries(customers.map((c) => [c.name, c.id]))

  // ── 1. Dati fisici cartone ───────────────────────────────────────────────────
  // [sku, grossKg, lenCm, widCm, htCm, cpl, lpp, upcOverride?]
  // Dimensioni = del CARTONE di spedizione (non del singolo prodotto)
  // cpl = cartoni per layer; lpp = layer per pallet
  type PhysRow = [string, number, number, number, number, number, number, number?]

  const physicalData: PhysRow[] = [
    // ── SAITAKU (Ethnic Distribution NL) ─────────────────────────────────────
    // Prodotti piccoli/leggeri (snack, condimenti)
    ["E0032",  1.2, 20, 15, 10, 12, 7],        // Wasabi Paste 43gr ×12
    ["E0033",  1.5, 25, 20, 10,  8, 6],        // Nori 14gr ×20
    ["E0034",  3.2, 28, 20, 18,  8, 5,  6],    // Ginger GLASS 190gr → 6pz/crt
    ["E0035",  3.8, 28, 22, 12,  8, 5, 12],    // Rice Vinegar 150ml → 12pz/crt
    ["E0036",  3.8, 35, 28, 20,  6, 5],        // Sushi Kit 361gr ×4
    ["E0037",  3.9, 28, 22, 12,  8, 5, 12],    // Teriyaki Sauce 150ml → 12pz/crt
    ["E0040",  0.9, 20, 15, 12, 10, 7],        // Black Sesame 95gr ×6
    ["E0045",  4.8, 35, 25, 18,  6, 5],        // Sushi Rice 500gr ×8
    ["E0121",  2.8, 22, 15, 18,  8, 6],        // Tamari 150ml ×6
    ["E0122",  1.4, 25, 18, 12,  8, 6],        // Miso Soup 88gr ×12
    ["E0123",  3.8, 38, 28, 18,  6, 5],        // Udon Noodles 300gr ×10
    ["E0124",  3.2, 28, 22, 18,  8, 5],        // Shiro Miso Paste 300gr ×4
    ["E0125",  1.6, 25, 18, 15,  8, 6],        // Panko 150gr ×6
    ["E0126",  2.2, 28, 22, 18,  8, 5],        // Ramen Noodles 250gr ×4
    ["E0130",  2.4, 25, 18, 15,  8, 5,  6],    // Mayo Wasabi 160gr → 6pz/crt
    ["E0139",  3.8, 38, 28, 18,  6, 5],        // Soba Noodles 300gr ×10
    ["E9998",  2.6, 30, 22, 15,  8, 5],        // Pre-Cooked Ramen 300gr ×6
    ["E9999",  2.2, 28, 20, 15,  8, 5,  6],    // Miso Sesame Ramen 200gr → 6pz/crt
    ["SE002",  0.6, 22, 15, 10, 12, 7],        // Nori Snacks 12gr ×12
    ["SK001",  3.2, 25, 18, 15,  8, 5],        // Shirataki Noodles 200gr ×6

    // ── MEXICANA — salse monoporzione (piccoli, leggeri) ─────────────────────
    ["MEX02",  2.0, 22, 18, 15, 10, 5],        // Nacho Cheese 220gr ×4
    ["MEX03",  2.8, 25, 18, 15,  8, 5],        // Guacamole Dip 220gr ×6
    ["MEX04",  2.8, 25, 18, 15,  8, 5],        // Chunky Mild Dip 230gr ×6
    ["MEX05",  2.8, 25, 18, 15,  8, 5],        // Hot Dip Sauce 230gr ×6
    ["MEX06",  3.5, 28, 20, 18,  8, 5],        // Jalapeños a Fette GLASS 210gr ×6
    ["MEX07",  4.0, 30, 22, 18,  6, 5],        // Mexican Beans 420gr ×6
    ["MEX08",  4.0, 30, 22, 18,  6, 5],        // Chili con Carne 410gr ×6
    ["MEX12",  5.2, 40, 30, 20,  6, 4],        // Taco Dinner Kit 335gr ×12
    ["MEX13",  4.2, 42, 32, 22,  4, 5],        // Taco Shell 150gr ×12  (fragile, voluminoso)
    ["MEX15",  6.8, 38, 28, 18,  6, 5],        // Black Beans 400gr ×12
    ["MEX16",  0.8, 20, 15, 10, 10, 7],        // Spezie Fajita Mix 35gr ×15

    // ── MEXICANA — vasi e barattoli grandi ───────────────────────────────────
    ["MEX01",  8.5, 32, 22, 22,  6, 4,  6],    // Jalapeños VASO 720ml GLASS → 6pz/crt
    ["SA014",  9.5, 35, 25, 22,  6, 4,  6],    // Salsa Mexicana DIP VASO GLASS 1070gr → 6pz/crt
    ["SA027",  9.0, 35, 25, 22,  6, 4],        // Guacamole 1050gr ×6
    ["SA115", 13.0, 40, 30, 28,  4, 4],        // Salsa Hot PET 2400gr ×4
    ["SA116", 12.0, 40, 30, 28,  4, 4],        // Ranch Tank 2200gr ×4
    ["SM004",  9.0, 32, 22, 22,  6, 4],        // Salsa Cheddar 1000ml ×6

    // ── TORTILLA CHIPS — voluminosi e leggeri ────────────────────────────────
    ["TA075",  6.8, 48, 35, 28,  4, 4],        // Taco Shells Foodservice 600gr ×4 (fragile)
    ["TC022",  8.5, 50, 38, 32,  4, 4],        // Tortilla Chips 450gr ×12
    ["TC023",  8.5, 50, 38, 32,  4, 4],        // Tortilla Chips Chili ×12
    ["TC024",  8.5, 50, 38, 32,  4, 4],        // Tortilla Chips Cheese ×12
    ["TC027",  8.5, 50, 38, 32,  4, 4, 12],    // Nacho Chips 450gr → 12pz/crt

    // ── BEVANDE ──────────────────────────────────────────────────────────────
    ["SO001",  12.5, 35, 25, 28, 6, 4],        // Soda Sifò 1.5L ×6
    ["SO001B", 12.5, 35, 25, 28, 6, 4],        // Soda Sifò bilico ×6
    ["ST001",  12.5, 35, 25, 28, 6, 4],        // Soda Tosca ×6
    ["E0163",   8.5, 30, 22, 22, 6, 4],        // Tonic Water 1L ×6

    // ── ALTRI ────────────────────────────────────────────────────────────────
    ["E0148",  11.5, 38, 28, 18, 6, 4],        // Mungobeans 780gr ×12 (pesante)
    ["E0160",   7.2, 40, 30, 25, 6, 4],        // Fried Onions 500gr ×10
    ["E0162",   3.5, 35, 25, 18, 6, 5],        // Tortilla Morbida 280gr ×10
    ["KIK06",   9.2, 30, 22, 22, 6, 4],        // Kikkoman Soia 1L ×6
  ]

  // Mappa sku → dati fisici per il calcolo allocazioni
  const physMap: Record<string, { kg: number; l: number; w: number; h: number; upc: number }> = {}

  console.log("→ Dati fisici prodotti...")
  let inserted = 0, updated = 0, skipped = 0

  for (const [sku, kg, l, w, h, cpl, lpp, upcOverride] of physicalData) {
    const prod = P[sku]
    if (!prod) { console.warn(`  ⚠ SKU non trovato: ${sku}`); skipped++; continue }

    // Aggiorna unitsPerCarton se mancante o indicato override
    if (upcOverride !== undefined && prod.unitsPerCarton !== upcOverride) {
      await db.product.update({
        where: { id: prod.id },
        data: { unitsPerCarton: upcOverride },
      })
      prod.unitsPerCarton = upcOverride
    }

    const upc = upcOverride ?? prod.unitsPerCarton ?? 1
    physMap[sku] = { kg, l, w, h, upc }

    if (prod.physical) {
      await db.productPhysical.update({
        where: { productId: prod.id },
        data: { grossWeightKg: d(kg), lengthCm: d(l), widthCm: d(w), heightCm: d(h), cartonsPerLayer: cpl, layersPerPallet: lpp },
      })
      updated++
    } else {
      await db.productPhysical.create({
        data: { productId: prod.id, grossWeightKg: d(kg), lengthCm: d(l), widthCm: d(w), heightCm: d(h), cartonsPerLayer: cpl, layersPerPallet: lpp },
      })
      inserted++
    }
  }

  // Popola physMap anche per prodotti senza override upc
  for (const [sku, kg, l, w, h, , , upcOverride] of physicalData) {
    const prod = P[sku]
    if (!prod) continue
    if (!physMap[sku]) {
      physMap[sku] = { kg, l, w, h, upc: upcOverride ?? prod.unitsPerCarton ?? 1 }
    }
  }

  console.log(`   ${inserted} inseriti, ${updated} aggiornati, ${skipped} saltati\n`)

  // ── 2. Pulizia spedizioni precedenti ────────────────────────────────────────
  console.log("→ Rimozione spedizioni demo precedenti...")
  await db.shipmentLine.deleteMany()
  await db.shipment.deleteMany()

  // ── 3. Spedizioni ────────────────────────────────────────────────────────────

  async function createShipment(opts: {
    code: string; legType: "IMPORT" | "DISTRIBUTION"
    carrier: string; from: string; to: string
    date: string; costEur: number; coeff?: number; notes?: string
    lines: { sku: string; qty: number; custName?: string }[]
  }) {
    const coeff = opts.coeff ?? 250
    const computed = allocate(opts.lines, physMap, opts.costEur, coeff)

    await db.shipment.create({
      data: {
        code: opts.code, legType: opts.legType,
        carrier: opts.carrier, routeFrom: opts.from, routeTo: opts.to,
        shipmentDate: new Date(opts.date),
        totalCostEur: d(opts.costEur),
        volumetricCoefficient: d(coeff),
        notes: opts.notes ?? null,
        lines: {
          create: computed.map((c) => ({
            productId: P[c.sku].id,
            customerId: c.custName ? (C[c.custName] ?? null) : null,
            quantityCartons: c.qty,
            quantityUnits: c.units,
            realWeightKg: d(c.realWeight.toFixed(3)),
            volumeM3: d(c.vol.toFixed(4)),
            volumetricWeightKg: d(c.volWeight.toFixed(3)),
            effectiveWeightKg: d(c.effWeight.toFixed(3)),
            allocatedCostEur: d(c.allocCost.toFixed(4)),
            allocatedCostPerUnitEur: d(c.costPerUnit.toFixed(5)),
          })),
        },
      },
    })

    const totalW = computed.reduce((s, c) => s + c.realWeight, 0)
    const totalV = computed.reduce((s, c) => s + c.vol, 0)
    console.log(`   ✓ ${opts.code}  ${computed.length} righe  ${totalW.toFixed(0)} kg  ${totalV.toFixed(2)} m³  €${opts.costEur.toLocaleString("it-IT")}`)
  }

  console.log("→ Spedizioni IMPORT...")

  // IMP-2024-001 — Container 20' da Rotterdam: SAITAKU completo (Ethnic Distribution NL)
  await createShipment({
    code: "IMP-2024-001", legType: "IMPORT",
    carrier: "DB Schenker Road", from: "Rotterdam", to: "Verona",
    date: "2024-09-18", costEur: 3_800, coeff: 333,
    notes: "Camion standard 13.6m. Scarico diretto magazzino Verona.",
    lines: [
      { sku: "E0032", qty: 40 }, { sku: "E0033", qty: 60 },
      { sku: "E0036", qty: 30 }, { sku: "E0040", qty: 50 },
      { sku: "E0045", qty: 40 }, { sku: "E0122", qty: 60 },
      { sku: "E0123", qty: 50 }, { sku: "E0125", qty: 40 },
      { sku: "E0126", qty: 35 }, { sku: "E0139", qty: 50 },
      { sku: "SE002", qty: 80 }, { sku: "SK001", qty: 30 },
    ],
  })

  // IMP-2024-002 — Camion da Rotterdam: SAITAKU sauces + miso (Ethnic Distribution NL)
  await createShipment({
    code: "IMP-2024-002", legType: "IMPORT",
    carrier: "Kuehne+Nagel Road", from: "Rotterdam", to: "Verona",
    date: "2024-10-22", costEur: 3_100, coeff: 333,
    notes: "Carico misto sauces e paste. Pallet EUR 14 pz.",
    lines: [
      { sku: "E0034", qty: 40 }, { sku: "E0035", qty: 50 },
      { sku: "E0037", qty: 60 }, { sku: "E0121", qty: 50 },
      { sku: "E0124", qty: 30 }, { sku: "E0130", qty: 40 },
      { sku: "E9998", qty: 50 }, { sku: "E9999", qty: 40 },
      { sku: "KIK06", qty: 25 },
    ],
  })

  // IMP-2024-003 — Camion da Madrid: MEXICANA (Bernal + Giaguaro + San Pedro)
  await createShipment({
    code: "IMP-2024-003", legType: "IMPORT",
    carrier: "Dachser Spain", from: "Madrid", to: "Verona",
    date: "2024-11-07", costEur: 2_400,
    notes: "Spedizione mista fornitori ibérici. Transito Brennero.",
    lines: [
      { sku: "MEX01", qty: 30 }, { sku: "MEX06", qty: 50 },
      { sku: "MEX07", qty: 60 }, { sku: "MEX08", qty: 40 },
      { sku: "MEX12", qty: 40 }, { sku: "MEX13", qty: 30 },
      { sku: "MEX15", qty: 60 }, { sku: "MEX16", qty: 80 },
    ],
  })

  // IMP-2024-004 — Camion da Belgio/Olanda: tortilla chips + bevande
  await createShipment({
    code: "IMP-2024-004", legType: "IMPORT",
    carrier: "Geodis Road", from: "Anversa", to: "Verona",
    date: "2024-12-03", costEur: 2_200, coeff: 333,
    notes: "Chips molto volumetrici — coeff. 333. Bevande gasate.",
    lines: [
      { sku: "TC022", qty: 25 }, { sku: "TC023", qty: 20 },
      { sku: "TC024", qty: 20 }, { sku: "TC027", qty: 20 },
      { sku: "TA075", qty: 15 }, { sku: "E0160", qty: 30 },
      { sku: "SO001", qty: 40 }, { sku: "ST001", qty: 30 },
      { sku: "E0163", qty: 25 },
    ],
  })

  // IMP-2025-001 — Camion da Rotterdam: restock SAITAKU + miso + shirataki
  await createShipment({
    code: "IMP-2025-001", legType: "IMPORT",
    carrier: "DB Schenker Road", from: "Rotterdam", to: "Verona",
    date: "2025-01-20", costEur: 4_100, coeff: 333,
    notes: "Restock Q1 2025. Prodotti alta rotazione.",
    lines: [
      { sku: "E0032", qty: 60 }, { sku: "E0033", qty: 80 },
      { sku: "E0040", qty: 60 }, { sku: "E0045", qty: 50 },
      { sku: "E0122", qty: 70 }, { sku: "E0123", qty: 60 },
      { sku: "E0125", qty: 50 }, { sku: "E0139", qty: 60 },
      { sku: "SE002", qty: 100 },{ sku: "SK001", qty: 40 },
      { sku: "E0148", qty: 35 },
    ],
  })

  // IMP-2025-002 — Camion da Olanda/Belgio: salse grandi + mex monoporzione
  await createShipment({
    code: "IMP-2025-002", legType: "IMPORT",
    carrier: "Fercam International", from: "Rotterdam", to: "Verona",
    date: "2025-02-14", costEur: 2_600,
    notes: "Salse HoReCa formato grande + monoporzioni MEX.",
    lines: [
      { sku: "SA014", qty: 20 }, { sku: "SA027", qty: 20 },
      { sku: "SA115", qty: 15 }, { sku: "SA116", qty: 15 },
      { sku: "SM004", qty: 25 }, { sku: "MEX02", qty: 40 },
      { sku: "MEX03", qty: 50 }, { sku: "MEX04", qty: 50 },
      { sku: "MEX05", qty: 50 }, { sku: "E0162", qty: 40 },
      { sku: "SO001B", qty: 30 },
    ],
  })

  console.log("\n→ Spedizioni DISTRIBUZIONE...")

  // DIST-2025-001 — Metro + MIGROSS
  await createShipment({
    code: "DIST-2025-001", legType: "DISTRIBUTION",
    carrier: "Fercam S.p.A.", from: "Verona", to: "Lombardia/Veneto",
    date: "2025-02-05", costEur: 680,
    notes: "Consegna DC Metro Sesto + Migross Brescia.",
    lines: [
      { sku: "E0032", qty: 8,  custName: "METRO" },
      { sku: "E0033", qty: 10, custName: "METRO" },
      { sku: "E0045", qty: 8,  custName: "METRO" },
      { sku: "E0123", qty: 10, custName: "METRO" },
      { sku: "KIK06", qty: 6,  custName: "METRO" },
      { sku: "TC022", qty: 8,  custName: "METRO" },
      { sku: "MEX12", qty: 10, custName: "METRO" },
      { sku: "E0033", qty: 8,  custName: "MIGROSS" },
      { sku: "E0040", qty: 6,  custName: "MIGROSS" },
      { sku: "E0122", qty: 8,  custName: "MIGROSS" },
      { sku: "TC022", qty: 6,  custName: "MIGROSS" },
      { sku: "MEX15", qty: 10, custName: "MIGROSS" },
    ],
  })

  // DIST-2025-002 — Rossetto + Tosano
  await createShipment({
    code: "DIST-2025-002", legType: "DISTRIBUTION",
    carrier: "Arcese Trasporti", from: "Verona", to: "Treviso/Verona",
    date: "2025-03-06", costEur: 420,
    notes: "Giro punti vendita Nord-Est.",
    lines: [
      { sku: "E0032", qty: 6,  custName: "Rossetto" },
      { sku: "E0045", qty: 8,  custName: "Rossetto" },
      { sku: "E0139", qty: 8,  custName: "Rossetto" },
      { sku: "TC023", qty: 8,  custName: "Rossetto" },
      { sku: "MEX07", qty: 10, custName: "Rossetto" },
      { sku: "E0033", qty: 6,  custName: "Tosano" },
      { sku: "E0122", qty: 8,  custName: "Tosano" },
      { sku: "TC022", qty: 6,  custName: "Tosano" },
      { sku: "MEX12", qty: 8,  custName: "Tosano" },
    ],
  })

  // DIST-2025-003 — UNICOMM + Maxi Dì
  await createShipment({
    code: "DIST-2025-003", legType: "DISTRIBUTION",
    carrier: "GLS Italy", from: "Verona", to: "Veneto/Friuli",
    date: "2025-04-03", costEur: 510,
    notes: "Consegna multipla UNICOMM Vicenza + Maxi Dì depositi.",
    lines: [
      { sku: "E0036", qty: 8,  custName: "UNICOMM" },
      { sku: "E0045", qty: 10, custName: "UNICOMM" },
      { sku: "E0123", qty: 12, custName: "UNICOMM" },
      { sku: "KIK06", qty: 8,  custName: "UNICOMM" },
      { sku: "TC024", qty: 8,  custName: "UNICOMM" },
      { sku: "MEX15", qty: 12, custName: "UNICOMM" },
      { sku: "E0032", qty: 6,  custName: "Maxi Dì" },
      { sku: "E0040", qty: 8,  custName: "Maxi Dì" },
      { sku: "TC022", qty: 8,  custName: "Maxi Dì" },
      { sku: "MEX07", qty: 8,  custName: "Maxi Dì" },
    ],
  })

  // DIST-2025-004 — BENNET + SOGEGROSS + Gruppo Poli
  await createShipment({
    code: "DIST-2025-004", legType: "DISTRIBUTION",
    carrier: "BRT Corriere Espresso", from: "Verona", to: "Emilia/Liguria/Trentino",
    date: "2025-04-22", costEur: 590,
    notes: "Giro lungo: BENNET Emilia, SOGEGROSS Liguria, Gruppo Poli Trentino.",
    lines: [
      { sku: "E0033", qty: 8,  custName: "BENNET" },
      { sku: "E0045", qty: 8,  custName: "BENNET" },
      { sku: "E0126", qty: 6,  custName: "BENNET" },
      { sku: "TC023", qty: 8,  custName: "BENNET" },
      { sku: "MEX12", qty: 10, custName: "BENNET" },
      { sku: "MEX13", qty: 8,  custName: "BENNET" },
      { sku: "E0040", qty: 6,  custName: "SOGEGROSS" },
      { sku: "E0122", qty: 8,  custName: "SOGEGROSS" },
      { sku: "TC027", qty: 8,  custName: "SOGEGROSS" },
      { sku: "E0033", qty: 6,  custName: "Gruppo Poli" },
      { sku: "E0123", qty: 8,  custName: "Gruppo Poli" },
      { sku: "MEX15", qty: 8,  custName: "Gruppo Poli" },
    ],
  })

  // ── Summary ────────────────────────────────────────────────────────────────
  const [physN, shipN, lineN] = await Promise.all([
    db.productPhysical.count(),
    db.shipment.count(),
    db.shipmentLine.count(),
  ])
  console.log(`\n✅ Completato!`)
  console.log(`   Prodotti con dati fisici: ${physN}`)
  console.log(`   Spedizioni:               ${shipN}`)
  console.log(`   Righe spedizione:         ${lineN}`)
}

main()
  .catch((e) => { console.error("❌ Errore:", e); process.exit(1) })
  .finally(() => db.$disconnect())
