"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface MonthlyData {
  month: string
  import: number
  distribuzione: number
}

interface Props {
  data: MonthlyData[]
}

function euroFormat(v: number) {
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}k`
  return `€${v.toFixed(0)}`
}

export function ShipmentTrendChart({ data }: Props) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={euroFormat}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          formatter={(value: number) => `€${value.toFixed(2)}`}
          labelStyle={{ fontWeight: 600, color: "#1e293b" }}
          contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
        <Bar dataKey="import" fill="#6366f1" radius={[3, 3, 0, 0]} name="import" />
        <Bar dataKey="distribuzione" fill="#06b6d4" radius={[3, 3, 0, 0]} name="distribuzione" />
      </BarChart>
    </ResponsiveContainer>
  )
}
