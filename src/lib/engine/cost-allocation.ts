import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ─── Tipi di input ────────────────────────────────────────────────────────────

export interface ShipmentInput {
  totalCostEur: number | string;
  /** kg/m³ — default 250 (groupage stradale), 333 (full truck), 167 (marittimo) */
  volumetricCoefficient?: number;
}

export interface LineInput {
  productId: string;
  customerId?: string | null; // null/undefined per import
  quantityCartons: number;
  quantityUnitsPerCarton: number; // pezzi/crt
  grossWeightKgPerCarton: number; // peso lordo per cartone
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

// ─── Tipi di output ───────────────────────────────────────────────────────────

export interface LineResult {
  productId: string;
  customerId: string | null;
  quantityCartons: number;
  quantityUnits: number;

  realWeightKg: Decimal;
  volumeM3: Decimal;
  volumetricWeightKg: Decimal;
  effectiveWeightKg: Decimal;
  effectiveWeightShare: Decimal; // % sul totale spedizione (0–1)

  allocatedCostEur: Decimal;
  allocatedCostPerUnitEur: Decimal; // €/pezzo
  allocatedCostPerCartonEur: Decimal;
}

export interface AllocationResult {
  totalCostEur: Decimal;
  totalRealWeightKg: Decimal;
  totalVolumeM3: Decimal;
  totalEffectiveWeightKg: Decimal;
  lines: LineResult[];
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function allocateTransportCost(
  shipment: ShipmentInput,
  lines: LineInput[]
): AllocationResult {
  if (lines.length === 0) throw new Error("Nessuna riga nella spedizione");

  const totalCost = new Decimal(shipment.totalCostEur);
  if (totalCost.lte(0)) throw new Error("Il costo di trasporto deve essere > 0");

  const coeff = new Decimal(shipment.volumetricCoefficient ?? 250);

  // Step 1 — calcola i pesi fisici per ogni riga
  const computed = lines.map((l) => computeLinePhysics(l, coeff));

  const totalEffective = computed.reduce(
    (sum, c) => sum.plus(c.effectiveWeightKg),
    new Decimal(0)
  );

  if (totalEffective.eq(0)) {
    throw new Error(
      "Peso effettivo totale = 0: inserire dimensioni e pesi per i prodotti"
    );
  }

  // Step 2 — alloca il costo pro-rata sull'ingombro effettivo
  // Se ci sono più clienti: prima per cliente, poi per SKU dentro il cliente
  const uniqueCustomers = [
    ...new Set(lines.map((l) => l.customerId ?? null)),
  ];
  const isMultiCustomer =
    uniqueCustomers.length > 1 ||
    (uniqueCustomers.length === 1 && uniqueCustomers[0] !== null);

  let results: LineResult[];

  if (!isMultiCustomer || uniqueCustomers.every((c) => c === null)) {
    // Import o distribuzione single-client: allocazione diretta
    results = computed.map((c) => {
      const share = c.effectiveWeightKg.div(totalEffective);
      const allocated = totalCost.times(share);
      const perUnit = allocated.div(c.quantityUnits);
      return {
        ...c,
        effectiveWeightShare: share,
        allocatedCostEur: allocated,
        allocatedCostPerUnitEur: perUnit,
        allocatedCostPerCartonEur: perUnit.times(c.quantityUnitsPerCarton),
      };
    });
  } else {
    // Multi-cliente: prima alloca per cliente, poi per SKU dentro ogni cliente
    results = allocateMultiCustomer(computed, totalCost, totalEffective);
  }

  // Verifica che la somma allocata eguagli il totale (±1 centesimo per arrotondamenti)
  const allocatedSum = results.reduce(
    (s, r) => s.plus(r.allocatedCostEur),
    new Decimal(0)
  );
  const diff = totalCost.minus(allocatedSum).abs();
  if (diff.gt(new Decimal("0.01"))) {
    throw new Error(
      `Errore di allocazione: somma allocata ${allocatedSum.toFixed(4)} ≠ totale ${totalCost.toFixed(4)}`
    );
  }

  return {
    totalCostEur: totalCost,
    totalRealWeightKg: computed.reduce(
      (s, c) => s.plus(c.realWeightKg),
      new Decimal(0)
    ),
    totalVolumeM3: computed.reduce(
      (s, c) => s.plus(c.volumeM3),
      new Decimal(0)
    ),
    totalEffectiveWeightKg: totalEffective,
    lines: results,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ComputedLine extends Omit<LineResult, "effectiveWeightShare" | "allocatedCostEur" | "allocatedCostPerUnitEur" | "allocatedCostPerCartonEur"> {
  quantityUnitsPerCarton: number;
}

function computeLinePhysics(l: LineInput, coeff: Decimal): ComputedLine {
  const cartons = new Decimal(l.quantityCartons);
  const unitsPerCrt = l.quantityUnitsPerCarton;

  const realWeight = cartons.times(l.grossWeightKgPerCarton);

  const volumePerCarton = new Decimal(l.lengthCm)
    .times(l.widthCm)
    .times(l.heightCm)
    .div(1_000_000); // cm³ → m³
  const volume = cartons.times(volumePerCarton);

  const volumetricWeight = volume.times(coeff);
  const effectiveWeight = Decimal.max(realWeight, volumetricWeight);

  return {
    productId: l.productId,
    customerId: l.customerId ?? null,
    quantityCartons: l.quantityCartons,
    quantityUnits: l.quantityCartons * unitsPerCrt,
    quantityUnitsPerCarton: unitsPerCrt,
    realWeightKg: realWeight,
    volumeM3: volume,
    volumetricWeightKg: volumetricWeight,
    effectiveWeightKg: effectiveWeight,
  };
}

function allocateMultiCustomer(
  computed: ComputedLine[],
  totalCost: Decimal,
  totalEffective: Decimal
): LineResult[] {
  // Raggruppa per cliente
  const byCustomer = new Map<string | null, ComputedLine[]>();
  for (const c of computed) {
    const key = c.customerId;
    if (!byCustomer.has(key)) byCustomer.set(key, []);
    byCustomer.get(key)!.push(c);
  }

  const results: LineResult[] = [];

  for (const [, group] of Array.from(byCustomer)) {
    const customerEffective = group.reduce(
      (s, c) => s.plus(c.effectiveWeightKg),
      new Decimal(0)
    );
    // Quota del costo totale spettante a questo cliente
    const customerCost = totalCost
      .times(customerEffective)
      .div(totalEffective);

    for (const c of group) {
      const share = c.effectiveWeightKg.div(customerEffective);
      const shareOfTotal = c.effectiveWeightKg.div(totalEffective);
      const allocated = customerCost.times(share);
      const perUnit = allocated.div(c.quantityUnits);
      results.push({
        ...c,
        effectiveWeightShare: shareOfTotal,
        allocatedCostEur: allocated,
        allocatedCostPerUnitEur: perUnit,
        allocatedCostPerCartonEur: perUnit.times(c.quantityUnitsPerCarton),
      });
    }
  }

  return results;
}

// ─── Utility: stima costo trasporto da benchmark storico ─────────────────────

export interface TransportBenchmark {
  avgCostPerKg: number;
  avgCostPerM3: number;
}

export function estimateTransportCost(
  lines: LineInput[],
  benchmark: TransportBenchmark,
  volumetricCoefficient = 250
): { byWeight: Decimal; byVolume: Decimal; recommended: Decimal } {
  const coeff = new Decimal(volumetricCoefficient);
  let totalReal = new Decimal(0);
  let totalVolume = new Decimal(0);

  for (const l of lines) {
    const cartons = new Decimal(l.quantityCartons);
    totalReal = totalReal.plus(cartons.times(l.grossWeightKgPerCarton));
    const vol = new Decimal(l.lengthCm)
      .times(l.widthCm)
      .times(l.heightCm)
      .div(1_000_000)
      .times(cartons);
    totalVolume = totalVolume.plus(vol);
  }

  const totalEffective = Decimal.max(totalReal, totalVolume.times(coeff));

  const byWeight = totalEffective.times(benchmark.avgCostPerKg);
  const byVolume = totalVolume.times(benchmark.avgCostPerM3);
  const recommended = Decimal.max(byWeight, byVolume);

  return { byWeight, byVolume, recommended };
}
