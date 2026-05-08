import { describe, it, expect } from "vitest"
import { palletize, EUR_PALLET, type PalletizerItem } from "./palletizer"

// ─── Fixtures realisti ────────────────────────────────────────────────────────

// BLACK BEANS 400g, 12pz/crt — denso, robusto (classe 1)
// Cartone 40×30×22 cm, 5.2 kg → densità ≈ 197 kg/m³
const BLACK_BEANS: PalletizerItem = {
  productId: "MEX15",
  productName: "MEXICANA BLACK BEANS 400GR",
  totalCartons: 0, // override per ogni test
  grossWeightKgPerCarton: 5.2,
  lengthCm: 40,
  widthCm: 30,
  heightCm: 22,
  fragilityClass: 1,
  foodCategory: "DRY",
}

// TORTILLA CHIPS 450g, 12pz/crt — leggero, voluminoso (classe 3)
// Cartone 40×30×35 cm, 5.8 kg → densità ≈ 138 kg/m³
const CHIPS: PalletizerItem = {
  productId: "TC022",
  productName: "TORTILLA CHIPS 450GR",
  totalCartons: 0,
  grossWeightKgPerCarton: 5.8,
  lengthCm: 40,
  widthCm: 30,
  heightCm: 35,
  fragilityClass: 3,
  foodCategory: "DRY",
}

// JALAPEÑOS VASO 720ml, 6pz/crt — pesante/vetro (classe 2)
// Cartone 28×20×20 cm, 4.9 kg → densità ≈ 438 kg/m³
const JALAP: PalletizerItem = {
  productId: "MEX01",
  productName: "JALAPEÑOS VASO 720ML",
  totalCartons: 0,
  grossWeightKgPerCarton: 4.9,
  lengthCm: 28,
  widthCm: 20,
  heightCm: 20,
  fragilityClass: 2,
  foodCategory: "GLASS",
}

// SALSA RANCH TANK 2200g, 4pz/crt — molto pesante (classe 1)
// Cartone 35×25×25 cm, 9.5 kg → densità ≈ 435 kg/m³
const RANCH: PalletizerItem = {
  productId: "SA116",
  productName: "SALSA RANCH TANK 2200GR",
  totalCartons: 0,
  grossWeightKgPerCarton: 9.5,
  lengthCm: 35,
  widthCm: 25,
  heightCm: 25,
  fragilityClass: 1,
  foodCategory: "LIQUID",
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — mono-prodotto: 80 crt di Black Beans su pallet EUR
//
// Pallet EUR: 120×80 cm base, max 180 cm, max 800 kg
// Orientazione cartone 40×30:
//   O1: floor(120/40)=3 × floor(80/30)=2 = 6 crt/strato
//   O2: floor(120/30)=4 × floor(80/40)=2 = 8 crt/strato  ← migliore
//
// 80 crt / 8 crt/strato = 10 strati
// Altezza: 10 × 22 = 220 cm → supera 180 cm!
//
// Quanti strati stanno in 180 cm? floor(180/22) = 8 strati = 64 crt → pallet 1
// Rimanenti: 16 crt → 2 strati → pallet 2
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 1 — mono-prodotto Black Beans (multi-pallet per altezza)", () => {
  const result = palletize([{ ...BLACK_BEANS, totalCartons: 80 }])

  it("servono 2 pallet (80 crt non entrano in altezza su uno solo)", () => {
    expect(result.totalPallets).toBe(2)
  })

  it("pallet 1: 8 strati × 8 crt/strato = 64 crt", () => {
    const p1 = result.pallets[0]
    const totalCrt = p1.layers.reduce((s, l) => s + l.cartonsInLayer, 0)
    expect(totalCrt).toBe(64)
    expect(p1.layers).toHaveLength(8)
  })

  it("pallet 1: altezza 8×22=176 cm ≤ 180 cm", () => {
    expect(result.pallets[0].totalHeightCm).toBe(176)
  })

  it("pallet 2: 16 crt rimanenti in 2 strati", () => {
    const p2 = result.pallets[1]
    const totalCrt = p2.layers.reduce((s, l) => s + l.cartonsInLayer, 0)
    expect(totalCrt).toBe(16)
    expect(p2.layers).toHaveLength(2)
  })

  it("ogni strato è 8 crt (4 lungo 120 cm × 2 lungo 80 cm)", () => {
    const layer = result.pallets[0].layers[0]
    expect(layer.cartonsAlongLength).toBe(4)
    expect(layer.cartonsAlongWidth).toBe(2)
    expect(layer.cartonsInLayer).toBe(8)
  })

  it("peso pallet 1: 64 × 5.2 = 332.8 kg (ben sotto 800 kg)", () => {
    expect(result.pallets[0].totalWeightKg).toBeCloseTo(332.8, 1)
  })

  it("istruzioni generate (non vuote)", () => {
    expect(result.loadingInstructions.length).toBeGreaterThan(0)
    expect(result.loadingInstructions.some((l) => l.includes("BLACK BEANS"))).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — pallet misto: Beans + Jalapeños + Chips
//
// Ordine ristorante: 16 crt beans, 10 crt jalapeños, 8 crt chips
//
// Ordinamento atteso (fragilità ASC → densità DESC):
//   1. BLACK BEANS  (frag=1, densità≈197) → base
//   2. JALAPEÑOS    (frag=2, densità≈438) → centro
//   3. CHIPS        (frag=3, densità≈138) → cima
//
// Calcolo strati (orientazione ottimale già testata sopra):
//   Beans:   cpl=8, 16crt → 2 strati h=22cm cadauno → 44 cm tot
//   Jalap:   28×20 → O1: floor(120/28)=4 × floor(80/20)=4 = 16 → O2: floor(120/20)=6 × floor(80/28)=2 = 12 → O1=16
//            10 crt / 16 cpl → 1 strato con 10 crt, h=20 cm → tot 64 cm
//   Chips:   cpl=8, 8 crt → 1 strato h=35 cm → tot 99 cm ≤ 180 ✓
//
// Tutto su 1 pallet!
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 2 — pallet misto (ordine ristorante): Beans + Jalapeños + Chips", () => {
  const result = palletize([
    { ...BLACK_BEANS, totalCartons: 16 },
    { ...JALAP, totalCartons: 10 },
    { ...CHIPS, totalCartons: 8 },
  ])

  it("tutto su 1 pallet", () => {
    expect(result.totalPallets).toBe(1)
  })

  const pallet = () => result.pallets[0]

  it("4 layer totali: 2 beans + 1 jalap + 1 chips", () => {
    expect(pallet().layers).toHaveLength(4)
  })

  it("i layer rispettano l'ordine fragilità: beans prima, chips ultimi", () => {
    const layers = pallet().layers
    expect(layers[0].productId).toBe("MEX15")  // beans, frag=1
    expect(layers[1].productId).toBe("MEX15")  // beans, ancora
    expect(layers[2].productId).toBe("MEX01")  // jalap, frag=2
    expect(layers[3].productId).toBe("TC022")  // chips, frag=3
  })

  it("beans: 2 strati da 8 crt ciascuno", () => {
    expect(pallet().layers[0].cartonsInLayer).toBe(8)
    expect(pallet().layers[1].cartonsInLayer).toBe(8)
    expect(pallet().layers[0].layerHeightCm).toBe(22)
  })

  it("jalapeños: 1 strato con 10 crt su capacità 16 (layer parziale)", () => {
    const jalLayer = pallet().layers[2]
    expect(jalLayer.cartonsInLayer).toBe(10)
    expect(jalLayer.cartonsAlongLength * jalLayer.cartonsAlongWidth).toBe(16)
  })

  it("chips: 1 strato da 8 crt in cima", () => {
    const chipsLayer = pallet().layers[3]
    expect(chipsLayer.cartonsInLayer).toBe(8)
    expect(chipsLayer.fragilityClass).toBe(3)
  })

  it("altezza totale: 22+22+20+35 = 99 cm ≤ 180 cm", () => {
    expect(pallet().totalHeightCm).toBe(99)
  })

  it("peso totale: (16×5.2) + (10×4.9) + (8×5.8) = 83.2+49+46.4 = 178.6 kg", () => {
    expect(pallet().totalWeightKg).toBeCloseTo(178.6, 1)
  })

  it("nessun warning (nessun vetro sotto pesante in questo caso)", () => {
    // jalap è GLASS ma è sopra i DRY beans che non pesano schiaccianti
    expect(result.warnings).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — limite peso: Ranch Tank (9.5 kg/crt) satura il peso prima dell'altezza
//
// Ranch: cpl: floor(120/35)=3 × floor(80/25)=3 = 9 crt/strato, h=25 cm
// Peso max 800 kg / 9.5 kg = 84 crt max per peso
// Altezza max 180 cm / 25 cm = 7 strati = 63 crt
// → l'altezza è il vincolo reale (63 < 84)
//
// Ordine: 100 crt Ranch
// Pallet 1: 7 strati × 9 crt = 63 crt, h=175 cm, peso=598.5 kg
// Pallet 2: 37 crt rimanenti → 4 strati × 9 + 1 strato × 1 = 37 crt, h=125 cm
// (4 strati pieni: 36 crt, 1 strato con 1 crt)
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 3 — vincolo altezza Ranch Tank (100 crt)", () => {
  const result = palletize([{ ...RANCH, totalCartons: 100 }])

  it("servono 2 pallet", () => {
    expect(result.totalPallets).toBe(2)
  })

  it("pallet 1: 7 strati × 9 crt = 63 crt, altezza 175 cm", () => {
    const p1 = result.pallets[0]
    const total = p1.layers.reduce((s, l) => s + l.cartonsInLayer, 0)
    expect(total).toBe(63)
    expect(p1.totalHeightCm).toBe(175)
    expect(p1.totalWeightKg).toBeCloseTo(63 * 9.5, 1)
  })

  it("pallet 2: 37 crt rimanenti", () => {
    const p2 = result.pallets[1]
    const total = p2.layers.reduce((s, l) => s + l.cartonsInLayer, 0)
    expect(total).toBe(37)
  })

  it("totale cartoni distribuiti correttamente: 63 + 37 = 100", () => {
    const grand = result.pallets.reduce((s, p) =>
      s + p.layers.reduce((ls, l) => ls + l.cartonsInLayer, 0), 0
    )
    expect(grand).toBe(100)
  })

  it("ottimizzazione orientazione: 3×3=9 crt/strato su pallet 120×80", () => {
    const layer = result.pallets[0].layers[0]
    expect(layer.cartonsAlongLength).toBe(3)
    expect(layer.cartonsAlongWidth).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — edge case: cartone non entra nel pallet → errore chiaro
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 4 — prodotto troppo grande (errore atteso)", () => {
  it("lancia errore se il cartone non entra nel pallet", () => {
    expect(() =>
      palletize([{
        ...CHIPS,
        productName: "CARTONE GIGANTE",
        lengthCm: 130,  // più lungo del pallet (120 cm)
        widthCm: 90,    // più largo del pallet (80 cm)
        totalCartons: 5,
      }])
    ).toThrow(/non entra nel pallet/)
  })
})
