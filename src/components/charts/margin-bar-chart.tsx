"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface DataPoint {
  productName: string
  avgMargin: number
  minMargin: number
  maxMargin: number
  foodCategory: string
}

const CATEGORY_COLORS: Record<string, string> = {
  DRY:        "#f59e0b",
  LIQUID:     "#3b82f6",
  GLASS:      "#8b5cf6",
  PERISHABLE: "#10b981",
}

function barColor(avg: number): string {
  if (avg >= 0.40) return "#059669"
  if (avg >= 0.30) return "#3b82f6"
  if (avg >= 0.20) return "#f59e0b"
  return "#ef4444"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d: DataPoint = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-900 mb-2 max-w-[200px] leading-tight">
        {d.productName}
      </p>
      <div className="space-y-1 tabular">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Media</span>
          <span className="font-medium">{(d.avgMargin * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Min</span>
          <span className="font-medium">{(d.minMargin * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Max</span>
          <span className="font-medium">{(d.maxMargin * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

export function MarginBarChart({ data }: { data: DataPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    name:
      d.productName.length > 22
        ? d.productName.slice(0, 22) + "…"
        : d.productName,
    pct: +(d.avgMargin * 100).toFixed(1),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={formatted}
        margin={{ top: 4, right: 16, left: 0, bottom: 60 }}
        barSize={22}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#64748b" }}
          angle={-38}
          textAnchor="end"
          interval={0}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
          {formatted.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.avgMargin)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
