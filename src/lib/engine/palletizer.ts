// Algoritmo di palletizzazione 3D con vincoli di densità e fragilità.
// Un layer = un prodotto (approccio pratico per magazzino manuale).
// Ordine di carico: fragilità ASC → densità DESC (pesante/robusto alla base).

export interface PalletizerItem {
  productId: string
  productName: string
  totalCartons: number
  grossWeightKgPerCarton: number
  lengthCm: number
  widthCm: number
  heightCm: number
  /** 1 = base (robusto), 2 = centro, 3 = solo in cima (fragile/leggero) */
  fragilityClass: 1 | 2 | 3
  /** DRY | LIQUID | GLASS | PERISHABLE */
  foodCategory: string
}

export interface PalletConfig {
  lengthCm: number   // default 120 (EUR)
  widthCm: number    // default 80  (EUR)
  maxHeightCm: number // default 180
  maxWeightKg: number // default 800
}

export const EUR_PALLET: PalletConfig = {
  lengthCm: 120,
  widthCm: 80,
  maxHeightCm: 180,
  maxWeightKg: 800,
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface LayerPlacement {
  layerNumber: number
  productId: string
  productName: string
  cartonsInLayer: number
  /** Cartoni disposti lungo il lato 120 cm del pallet */
  cartonsAlongLength: number
  /** Cartoni disposti lungo il lato 80 cm del pallet */
  cartonsAlongWidth: number
  /** Dimensione del cartone orientata lungo il lato 120 */
  cartonDimLengthCm: number
  /** Dimensione del cartone orientata lungo il lato 80 */
  cartonDimWidthCm: number
  /** Impronta reale del layer (≤ dimensioni pallet, ≤ layer sotto) */
  usedLengthCm: number
  usedWidthCm: number
  layerHeightCm: number
  cumulativeHeightCm: number
  layerWeightKg: number
  cumulativeWeightKg: number
  fragilityClass: number
  foodCategory: string
  densityKgM3: number
}

export interface PalletResult {
  palletNumber: number
  layers: LayerPlacement[]
  totalHeightCm: number
  totalWeightKg: number
  volumeUsedM3: number
  fillByVolumePct: number       // % volume usato vs capacità max
  weightUtilizationPct: number  // % peso usato vs max
}

export interface PalletizationResult {
  pallets: PalletResult[]
  totalPallets: number
  avgFillByVolumePct: number
  loadingInstructions: string[]
  warnings: string[]
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function palletize(
  items: PalletizerItem[],
  config: PalletConfig = EUR_PALLET
): PalletizationResult {
  if (items.length === 0) throw new Error("Nessun prodotto da palletizzare")

  const warnings: string[] = []

  // Valida che ogni cartone entri fisicamente nel pallet (senza vincolo sporgenze)
  for (const item of items) {
    const { count } = bestOrientation(item.lengthCm, item.widthCm, config.lengthCm, config.widthCm)
    if (count === 0) {
      throw new Error(
        `Prodotto "${item.productName}" (${item.lengthCm}×${item.widthCm} cm) ` +
        `non entra nel pallet ${config.lengthCm}×${config.widthCm} cm`
      )
    }
    if (item.grossWeightKgPerCarton > config.maxWeightKg) {
      throw new Error(
        `Un cartone di "${item.productName}" pesa ${item.grossWeightKgPerCarton} kg, ` +
        `oltre il limite pallet di ${config.maxWeightKg} kg`
      )
    }
  }

  // Ordinamento: fragilità ASC, poi densità DESC (pesante/robusto prima)
  const sorted = [...items].sort((a, b) => {
    if (a.fragilityClass !== b.fragilityClass) {
      return a.fragilityClass - b.fragilityClass
    }
    return densityKgM3(b) - densityKgM3(a)
  })

  // Controllo vincoli food: GLASS e PERISHABLE non sotto prodotti pesanti
  checkFoodConstraints(sorted, warnings)

  const pallets: PalletResult[] = []
  let currentLayers: LayerPlacement[] = []
  let currentHeight = 0
  let currentWeight = 0
  let layerCounter = 0
  // Impronta massima disponibile per il prossimo layer (vincolo no-sporgenze)
  let currentTopL = config.lengthCm
  let currentTopW = config.widthCm

  const commitPallet = () => {
    if (currentLayers.length === 0) return
    pallets.push(buildPalletResult(pallets.length + 1, currentLayers, config))
    currentLayers = []
    currentHeight = 0
    currentWeight = 0
    layerCounter = 0
    currentTopL = config.lengthCm
    currentTopW = config.widthCm
  }

  for (const item of sorted) {
    let remaining = item.totalCartons

    while (remaining > 0) {
      // Calcola orientamento rispettando l'impronta del layer sottostante
      const orient = bestOrientation(item.lengthCm, item.widthCm, currentTopL, currentTopW)

      const weightAvail = config.maxWeightKg - currentWeight
      const maxByWeight = Math.floor(weightAvail / item.grossWeightKgPerCarton)
      const heightFits = currentHeight + item.heightCm <= config.maxHeightCm

      // Nuovo pallet se: altezza esaurita, peso esaurito, oppure nessun cartone
      // entra nell'impronta del layer corrente (vincolo no-sporgenze)
      if (!heightFits || maxByWeight === 0 || orient.count === 0) {
        commitPallet()
        continue
      }

      const canPlace = Math.min(remaining, orient.count, maxByWeight)
      const usedL = orient.rowsAlongL * orient.dimL
      const usedW = orient.rowsAlongW * orient.dimW

      currentHeight += item.heightCm
      currentWeight += canPlace * item.grossWeightKgPerCarton
      layerCounter++

      currentLayers.push({
        layerNumber: layerCounter,
        productId: item.productId,
        productName: item.productName,
        cartonsInLayer: canPlace,
        cartonsAlongLength: orient.rowsAlongL,
        cartonsAlongWidth: orient.rowsAlongW,
        cartonDimLengthCm: orient.dimL,
        cartonDimWidthCm: orient.dimW,
        usedLengthCm: usedL,
        usedWidthCm: usedW,
        layerHeightCm: item.heightCm,
        cumulativeHeightCm: currentHeight,
        layerWeightKg: canPlace * item.grossWeightKgPerCarton,
        cumulativeWeightKg: currentWeight,
        fragilityClass: item.fragilityClass,
        foodCategory: item.foodCategory,
        densityKgM3: densityKgM3(item),
      })

      // Il layer appena posizionato diventa il tetto per il prossimo
      currentTopL = usedL
      currentTopW = usedW

      remaining -= canPlace
    }
  }

  commitPallet()

  return {
    pallets,
    totalPallets: pallets.length,
    avgFillByVolumePct: average(pallets.map((p) => p.fillByVolumePct)),
    loadingInstructions: buildInstructions(pallets),
    warnings,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function densityKgM3(item: PalletizerItem): number {
  const volumeM3 = (item.lengthCm * item.widthCm * item.heightCm) / 1_000_000
  return item.grossWeightKgPerCarton / volumeM3
}

interface Orientation {
  count: number
  rowsAlongL: number
  rowsAlongW: number
  dimL: number  // dimensione cartone orientata lungo pallet L
  dimW: number  // dimensione cartone orientata lungo pallet W
}

function bestOrientation(
  lCm: number,
  wCm: number,
  maxL: number,
  maxW: number,
): Orientation {
  const o1L = Math.floor(maxL / lCm)
  const o1W = Math.floor(maxW / wCm)
  const o1 = o1L * o1W

  const o2L = Math.floor(maxL / wCm)
  const o2W = Math.floor(maxW / lCm)
  const o2 = o2L * o2W

  if (o1 >= o2) {
    return { count: o1, rowsAlongL: o1L, rowsAlongW: o1W, dimL: lCm, dimW: wCm }
  }
  return { count: o2, rowsAlongL: o2L, rowsAlongW: o2W, dimL: wCm, dimW: lCm }
}

function buildPalletResult(
  num: number,
  layers: LayerPlacement[],
  config: PalletConfig
): PalletResult {
  const totalH = layers.reduce((s, l) => s + l.layerHeightCm, 0)
  const totalW = layers.reduce((s, l) => s + l.layerWeightKg, 0)

  const volumeUsed = layers.reduce((s, l) => {
    const volPerCarton =
      (l.cartonDimLengthCm * l.cartonDimWidthCm * l.layerHeightCm) / 1_000_000
    return s + volPerCarton * l.cartonsInLayer
  }, 0)

  const maxVol = (config.lengthCm * config.widthCm * config.maxHeightCm) / 1_000_000

  return {
    palletNumber: num,
    layers,
    totalHeightCm: totalH,
    totalWeightKg: totalW,
    volumeUsedM3: volumeUsed,
    fillByVolumePct: (volumeUsed / maxVol) * 100,
    weightUtilizationPct: (totalW / config.maxWeightKg) * 100,
  }
}

function checkFoodConstraints(sorted: PalletizerItem[], warnings: string[]) {
  const glassIdx = sorted.findIndex((i) => i.foodCategory === "GLASS")
  const dryBelowGlass = sorted
    .slice(0, glassIdx)
    .filter((i) => i.foodCategory === "DRY" && densityKgM3(i) > 600)

  if (glassIdx > 0 && dryBelowGlass.length > 0) {
    warnings.push(
      "Attenzione: prodotti in vetro (GLASS) hanno prodotti molto pesanti " +
      "sotto di loro. Verificare che le stive reggano il peso."
    )
  }

  const liquidIdx = sorted.findIndex((i) => i.foodCategory === "LIQUID")
  const dryAboveLiquid = sorted
    .slice(liquidIdx + 1)
    .filter((i) => i.foodCategory === "DRY")

  if (liquidIdx >= 0 && dryAboveLiquid.length > 0) {
    warnings.push(
      "Prodotti DRY posizionati sopra prodotti LIQUID: " +
      "assicurarsi che i liquidi siano sigillati e i sacchetti di prodotti " +
      "secchi non possano danneggiarsi in caso di perdita."
    )
  }
}

function buildInstructions(pallets: PalletResult[]): string[] {
  const lines: string[] = []

  for (const pallet of pallets) {
    lines.push(`── PALLET ${pallet.palletNumber} ──────────────────────────`)

    // Raggruppa layer consecutivi dello stesso prodotto
    const groups: Array<{ name: string; layers: LayerPlacement[] }> = []
    for (const layer of pallet.layers) {
      const last = groups[groups.length - 1]
      if (last && last.name === layer.productName) {
        last.layers.push(layer)
      } else {
        groups.push({ name: layer.productName, layers: [layer] })
      }
    }

    for (const g of groups) {
      const first = g.layers[0]
      const totalCrt = g.layers.reduce((s, l) => s + l.cartonsInLayer, 0)
      const layerNums =
        g.layers.length === 1
          ? `Strato ${first.layerNumber}`
          : `Strati ${first.layerNumber}–${g.layers[g.layers.length - 1].layerNumber}`

      const tag =
        first.fragilityClass === 1 ? "🔵 base"
        : first.fragilityClass === 2 ? "🟡 centro"
        : "🔴 cima"

      lines.push(
        `  ${layerNums}: ${g.name}` +
        ` — ${totalCrt} crt` +
        ` (${first.cartonsAlongLength}×${first.cartonsAlongWidth} per strato)` +
        ` [${tag}, ${Math.round(first.densityKgM3)} kg/m³]`
      )
    }

    lines.push(
      `  → Altezza: ${pallet.totalHeightCm} cm | ` +
      `Peso: ${pallet.totalWeightKg.toFixed(1)} kg | ` +
      `Riempimento: ${pallet.fillByVolumePct.toFixed(1)}%`
    )
    lines.push("")
  }

  return lines
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((s, n) => s + n, 0) / nums.length
}
