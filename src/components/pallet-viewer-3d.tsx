"use client"

import { useRef } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Box } from "@react-three/drei"
import type { PalletResult } from "@/lib/engine/palletizer"

// Scale: 1 Three.js unit = 10 cm
const S = 0.1

const PRODUCT_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
  "#14b8a6", // teal
]

function PalletBase() {
  // EUR pallet: 120×80cm, 15cm high. Center at (0, 0.75, 0) in scaled units
  return (
    <Box args={[120 * S, 15 * S, 80 * S]} position={[0, (15 * S) / 2, 0]}>
      <meshStandardMaterial color="#92400e" roughness={0.8} />
    </Box>
  )
}

function CartonBox({
  x, y, z,
  w, h, d,
  color,
  opacity = 1,
}: {
  x: number; y: number; z: number
  w: number; h: number; d: number
  color: string
  opacity?: number
}) {
  return (
    <Box
      args={[w * S, h * S, d * S]}
      position={[x * S, y * S, z * S]}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.6}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </Box>
  )
}

interface Props {
  pallet: PalletResult
  productColorMap: Map<string, string>
}

export function PalletViewer3D({ pallet, productColorMap }: Props) {
  const PALLET_H = 15

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
      <Canvas
        camera={{ position: [18, 16, 18], fov: 45 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.4} />

        {/* Pallet base */}
        <PalletBase />

        {/* Cartons per layer */}
        {pallet.layers.map((layer) => {
          const color = productColorMap.get(layer.productId) ?? "#6366f1"
          const boxes: React.ReactNode[] = []
          const layerBottomY = PALLET_H + (layer.cumulativeHeightCm - layer.layerHeightCm)
          const boxCenterY = layerBottomY + layer.layerHeightCm / 2

          for (let i = 0; i < layer.cartonsAlongLength; i++) {
            for (let j = 0; j < layer.cartonsAlongWidth; j++) {
              const boxCenterX =
                -60 + i * layer.cartonDimLengthCm + layer.cartonDimLengthCm / 2
              const boxCenterZ =
                -40 + j * layer.cartonDimWidthCm + layer.cartonDimWidthCm / 2

              boxes.push(
                <CartonBox
                  key={`${layer.layerNumber}-${i}-${j}`}
                  x={boxCenterX}
                  y={boxCenterY}
                  z={boxCenterZ}
                  w={layer.cartonDimLengthCm - 0.5}
                  h={layer.layerHeightCm - 0.3}
                  d={layer.cartonDimWidthCm - 0.5}
                  color={color}
                />
              )
            }
          }
          return boxes
        })}

        {/* Grid helper */}
        <gridHelper args={[24, 24, "#374151", "#1f2937"]} position={[0, 0, 0]} />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2}
          makeDefault
        />
      </Canvas>
    </div>
  )
}

// Exports helper for parent component
export function buildProductColorMap(
  pallets: PalletResult[]
): Map<string, string> {
  const ids = new Set<string>()
  for (const pallet of pallets) {
    for (const layer of pallet.layers) {
      ids.add(layer.productId)
    }
  }
  const map = new Map<string, string>()
  Array.from(ids).forEach((id, idx) => {
    map.set(id, PRODUCT_COLORS[idx % PRODUCT_COLORS.length])
  })
  return map
}
