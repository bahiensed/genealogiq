'use client'

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const chartConfig = {
  count: { label: 'QR codes sold', color: 'var(--primary)' },
} satisfies ChartConfig

interface Props {
  data: { month: string; count: number }[]
}

export function QrConsumptionChart({ data }: Props) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} allowDecimals={false} width={32} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  )
}
