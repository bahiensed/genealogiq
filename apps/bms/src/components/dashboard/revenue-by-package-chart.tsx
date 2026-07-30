'use client'

import { useLocale } from 'next-intl'
import { Pie, PieChart, Cell } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@genealogiq/ui/chart'

const PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

interface Props {
  data: { name: string; revenue: number }[]
}

export function RevenueByPackageChart({ data }: Props) {
  const locale = useLocale()
  const chartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.name,
      { label: d.name, color: PALETTE[i % PALETTE.length] },
    ])
  ) satisfies ChartConfig

  const chartData = data.map((d, i) => ({
    ...d,
    fill: PALETTE[i % PALETTE.length],
  }))

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No sales data yet.
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="name"
              formatter={(value) =>
                new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(Number(value))
              }
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="revenue"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={3}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} stroke="transparent" />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" className="flex-wrap gap-y-1" />} />
      </PieChart>
    </ChartContainer>
  )
}
