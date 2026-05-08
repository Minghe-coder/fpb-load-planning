import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { allocateTransportCost, type LineInput } from "./cost-allocation";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNum(d: Decimal, decimals = 4) {
  return Number(d.toFixed(decimals));
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1
// Pallet mono-prodotto pesante: MEXICANA BLACK BEANS per GDO (Migross)
//
// Prodotto: MEX15 — cartone 12 pz, ~5.2 kg/crt, 40×30×22 cm
// Ordine:   80 cartoni = 960 pezzi
// Trasporto distribuzione: €160 (Verona → Migross)
//
// Atteso:
//   - tutto il costo va a MEX15
//   - peso reale 416 kg vs volumetrico 80 × 0.0264 m³ × 250 = 528 kg → vince volumetrico
//   - €/pezzo = 160 / 960 ≈ €0.1667
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 1 — pallet mono-prodotto pesante (Black Beans per Migross)", () => {
  const lines: LineInput[] = [
    {
      productId: "MEX15",
      customerId: "MIGROSS",
      quantityCartons: 80,
      quantityUnitsPerCarton: 12,
      grossWeightKgPerCarton: 5.2,
      lengthCm: 40,
      widthCm: 30,
      heightCm: 22,
    },
  ];

  const result = allocateTransportCost(
    { totalCostEur: 160, volumetricCoefficient: 250 },
    lines
  );
  const line = result.lines[0];

  it("una sola riga riceve tutto il costo", () => {
    expect(result.lines).toHaveLength(1);
    expect(toNum(line.allocatedCostEur)).toBe(160);
  });

  it("peso reale calcolato correttamente: 80 × 5.2 = 416 kg", () => {
    expect(toNum(line.realWeightKg, 2)).toBe(416);
  });

  it("volume calcolato correttamente: 80 × (40×30×22/1e6) = 2.112 m³", () => {
    expect(toNum(line.volumeM3, 4)).toBe(2.112);
  });

  it("peso volumetrico: 2.112 × 250 = 528 kg > 416 kg reali → vince volumetrico", () => {
    expect(toNum(line.volumetricWeightKg, 2)).toBe(528);
    expect(toNum(line.effectiveWeightKg, 2)).toBe(528);
    expect(line.effectiveWeightKg.gt(line.realWeightKg)).toBe(true);
  });

  it("costo per pezzo: 160 / 960 = €0.1667", () => {
    expect(toNum(line.allocatedCostPerUnitEur, 4)).toBe(
      toNum(new Decimal(160).div(960), 4)
    );
  });

  it("quantità pezzi: 80 × 12 = 960", () => {
    expect(line.quantityUnits).toBe(960);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2
// Pallet misto: ordine ristorante con leggero + pesante
//
// Prodotti:
//   A) TC022 — Tortilla Chips 450g, 12 pz/crt
//      Cartone: 40×30×35 cm, peso 5.8 kg/crt
//      Densità reale: 5.8 / (0.042 m³) ≈ 138 kg/m³  →  VOLUMETRICO vince
//      Peso volumetrico per cartone: 0.042 × 250 = 10.5 kg
//
//   B) MEX01 — Jalapeños vaso 720ml, 6 pz/crt
//      Cartone: 28×20×20 cm, peso 4.9 kg/crt
//      Densità reale: 4.9 / (0.0112 m³) ≈ 438 kg/m³  →  REALE vince
//      Peso volumetrico per cartone: 0.0112 × 250 = 2.8 kg
//
// Ordine: 10 crt Chips + 15 crt Jalapeños, stessa tratta (ristorante unico)
// Trasporto: €75
//
// Atteso:
//   Chips: eff = 10 × 10.5 = 105 kg
//   Jalapeños: eff = 15 × 4.9 = 73.5 kg
//   Totale eff: 178.5 kg
//   Chips share: 105/178.5 = 58.82% → €44.12
//   Jalapeños share: 73.5/178.5 = 41.18% → €30.88
//
// Chiave: le chips LEGGERE pagano PIÙ dei jalapeños PESANTI
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 2 — pallet misto leggero+pesante (ordine ristorante)", () => {
  const lines: LineInput[] = [
    {
      productId: "TC022",
      customerId: "RISTORANTE_X",
      quantityCartons: 10,
      quantityUnitsPerCarton: 12,
      grossWeightKgPerCarton: 5.8,
      lengthCm: 40,
      widthCm: 30,
      heightCm: 35,
    },
    {
      productId: "MEX01",
      customerId: "RISTORANTE_X",
      quantityCartons: 15,
      quantityUnitsPerCarton: 6,
      grossWeightKgPerCarton: 4.9,
      lengthCm: 28,
      widthCm: 20,
      heightCm: 20,
    },
  ];

  const result = allocateTransportCost(
    { totalCostEur: 75, volumetricCoefficient: 250 },
    lines
  );

  const chips = result.lines.find((l) => l.productId === "TC022")!;
  const jalap = result.lines.find((l) => l.productId === "MEX01")!;

  it("due righe di output", () => {
    expect(result.lines).toHaveLength(2);
  });

  it("chips: peso volumetrico (105 kg) > reale (58 kg) → ingombro effettivo = 105 kg", () => {
    expect(toNum(chips.realWeightKg, 2)).toBe(58);
    expect(toNum(chips.volumeM3, 4)).toBe(0.42);
    expect(toNum(chips.volumetricWeightKg, 2)).toBe(105);
    expect(toNum(chips.effectiveWeightKg, 2)).toBe(105);
  });

  it("jalapeños: peso reale (73.5 kg) > volumetrico (33.6 kg) → ingombro effettivo = 73.5 kg", () => {
    expect(toNum(jalap.realWeightKg, 2)).toBe(73.5);
    expect(toNum(jalap.volumeM3, 5)).toBe(0.168);
    expect(toNum(jalap.volumetricWeightKg, 2)).toBe(42);
    expect(toNum(jalap.effectiveWeightKg, 2)).toBe(73.5);
  });

  it("totale ingombro effettivo: 105 + 73.5 = 178.5 kg", () => {
    expect(toNum(result.totalEffectiveWeightKg, 2)).toBe(178.5);
  });

  it("chips pagano PIÙ dei jalapeños nonostante pesino meno (effetto volume)", () => {
    expect(chips.allocatedCostEur.gt(jalap.allocatedCostEur)).toBe(true);
  });

  it("chips: share 58.82%, costo €44.12", () => {
    const expectedShare = new Decimal(105).div(178.5);
    expect(toNum(chips.effectiveWeightShare, 4)).toBe(toNum(expectedShare, 4));
    expect(toNum(chips.allocatedCostEur, 2)).toBe(
      toNum(new Decimal(75).times(expectedShare), 2)
    );
  });

  it("jalapeños: share 41.18%, costo €30.88", () => {
    const expectedShare = new Decimal(73.5).div(178.5);
    expect(toNum(jalap.allocatedCostEur, 2)).toBe(
      toNum(new Decimal(75).times(expectedShare), 2)
    );
  });

  it("costo totale allocato = €75 (nessun centesimo perso)", () => {
    const total = result.lines.reduce(
      (s, l) => s.plus(l.allocatedCostEur),
      new Decimal(0)
    );
    expect(toNum(total, 2)).toBe(75);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 3
// Trasporto multi-cliente: un camion serve 2 clienti nella stessa tratta
//
// Cliente A — SCELGO:
//   TC027 Tortilla Nacho 450g, 12 pz/crt: 8 crt, 40×30×35 cm, 5.8 kg/crt
//   MEX15 Black Beans 400g, 12 pz/crt:   20 crt, 40×30×22 cm, 5.2 kg/crt
//
// Cliente B — METRO:
//   MEX01 Jalapeños 720ml, 6 pz/crt:     12 crt, 28×20×20 cm, 4.9 kg/crt
//   SA116 Ranch Tank 2200g, 4 pz/crt:     6 crt, 35×25×25 cm, 9.5 kg/crt
//
// Costo totale camion: €220
// Coeff volumetrico: 250
//
// Atteso — calcolo:
//   SCELGO:
//     TC027 eff = 8 × max(5.8, 0.042×250=10.5) = 8 × 10.5 = 84 kg
//     MEX15 eff = 20 × max(5.2, 0.0264×250=6.6) = 20 × 6.6  = 132 kg
//     SCELGO totale = 216 kg
//
//   METRO:
//     MEX01 eff = 12 × max(4.9, 0.0112×250=2.8) = 12 × 4.9  = 58.8 kg
//     SA116 eff = 6  × max(9.5, 0.021875×250=5.47) = 6 × 9.5 = 57 kg
//     METRO totale = 115.8 kg
//
//   Totale: 331.8 kg
//   SCELGO quota: 216/331.8 = 65.1% → €143.22
//   METRO quota:  115.8/331.8 = 34.9% → €76.78
//
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 3 — trasporto multi-cliente (SCELGO + METRO)", () => {
  const lines: LineInput[] = [
    // SCELGO
    {
      productId: "TC027",
      customerId: "SCELGO",
      quantityCartons: 8,
      quantityUnitsPerCarton: 12,
      grossWeightKgPerCarton: 5.8,
      lengthCm: 40,
      widthCm: 30,
      heightCm: 35,
    },
    {
      productId: "MEX15",
      customerId: "SCELGO",
      quantityCartons: 20,
      quantityUnitsPerCarton: 12,
      grossWeightKgPerCarton: 5.2,
      lengthCm: 40,
      widthCm: 30,
      heightCm: 22,
    },
    // METRO
    {
      productId: "MEX01",
      customerId: "METRO",
      quantityCartons: 12,
      quantityUnitsPerCarton: 6,
      grossWeightKgPerCarton: 4.9,
      lengthCm: 28,
      widthCm: 20,
      heightCm: 20,
    },
    {
      productId: "SA116",
      customerId: "METRO",
      quantityCartons: 6,
      quantityUnitsPerCarton: 4,
      grossWeightKgPerCarton: 9.5,
      lengthCm: 35,
      widthCm: 25,
      heightCm: 25,
    },
  ];

  const result = allocateTransportCost(
    { totalCostEur: 220, volumetricCoefficient: 250 },
    lines
  );

  const tc027 = result.lines.find((l) => l.productId === "TC027")!;
  const mex15 = result.lines.find((l) => l.productId === "MEX15")!;
  const mex01 = result.lines.find((l) => l.productId === "MEX01")!;
  const sa116 = result.lines.find((l) => l.productId === "SA116")!;

  it("4 righe di output", () => {
    expect(result.lines).toHaveLength(4);
  });

  it("TC027 (chips SCELGO): ingombro effettivo volumetrico 84 kg", () => {
    expect(toNum(tc027.effectiveWeightKg, 2)).toBe(84);
  });

  it("MEX15 (beans SCELGO): ingombro effettivo volumetrico 132 kg (6.6 > 5.2)", () => {
    expect(toNum(mex15.volumetricWeightKg, 2)).toBe(132);
    expect(toNum(mex15.effectiveWeightKg, 2)).toBe(132);
  });

  it("MEX01 (jalap METRO): ingombro effettivo reale 58.8 kg (4.9 > 2.8)", () => {
    expect(toNum(mex01.realWeightKg, 2)).toBe(58.8);
    expect(toNum(mex01.effectiveWeightKg, 2)).toBe(58.8);
  });

  it("SA116 (ranch METRO): ingombro effettivo reale 57 kg (9.5 > 5.47)", () => {
    expect(toNum(sa116.realWeightKg, 2)).toBe(57);
    expect(toNum(sa116.effectiveWeightKg, 2)).toBe(57);
  });

  it("SCELGO riceve ~65.1% del costo (€143.22)", () => {
    const scelgoTotal = [tc027, mex15].reduce(
      (s, l) => s.plus(l.allocatedCostEur),
      new Decimal(0)
    );
    const scelgoEff = new Decimal(216);
    const totalEff = new Decimal(331.8);
    const expected = new Decimal(220).times(scelgoEff).div(totalEff);
    expect(toNum(scelgoTotal, 2)).toBe(toNum(expected, 2));
  });

  it("METRO riceve ~34.9% del costo (€76.78)", () => {
    const metroTotal = [mex01, sa116].reduce(
      (s, l) => s.plus(l.allocatedCostEur),
      new Decimal(0)
    );
    const metroEff = new Decimal(115.8);
    const totalEff = new Decimal(331.8);
    const expected = new Decimal(220).times(metroEff).div(totalEff);
    expect(toNum(metroTotal, 2)).toBe(toNum(expected, 2));
  });

  it("dentro SCELGO, MEX15 paga più di TC027 (più ingombro effettivo)", () => {
    expect(mex15.allocatedCostEur.gt(tc027.allocatedCostEur)).toBe(true);
  });

  it("somma totale allocata = €220.00 (zero leakage)", () => {
    const total = result.lines.reduce(
      (s, l) => s.plus(l.allocatedCostEur),
      new Decimal(0)
    );
    expect(toNum(total, 2)).toBe(220);
  });

  it("costo per pezzo MEX01 = costo METRO riga / (12 × 6)", () => {
    expect(toNum(mex01.allocatedCostPerUnitEur, 6)).toBe(
      toNum(mex01.allocatedCostEur.div(72), 6)
    );
  });
});
