'use client'

import * as React from 'react'
import {
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

import { cn } from '@/lib/utils'

const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
    theme?: Record<keyof typeof THEMES, string>
  }
}

type ChartContextProps = { config: ChartConfig }

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error('useChart must be used within a <ChartContainer />')
  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<typeof ResponsiveContainer>['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted flex aspect-video justify-center text-xs [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden',
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.theme || cfg.color)
  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([theme, prefix]) =>
            `${prefix} [data-chart=${id}] {\n${colorConfig
              .map(([key, item]) => {
                const color = item.theme?.[theme as keyof typeof item.theme] || item.color
                return color ? `  --color-${key}: ${color};` : null
              })
              .filter(Boolean)
              .join('\n')}\n}`
          )
          .join('\n'),
      }}
    />
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const ChartTooltip = Tooltip

interface TooltipPayloadItem {
  name?: string | number
  dataKey?: string | number
  value?: string | number
  color?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any
}

interface ChartTooltipContentProps extends React.ComponentProps<'div'> {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: 'line' | 'dot' | 'dashed'
  nameKey?: string
  formatter?: (value: string | number, name: string | number) => React.ReactNode
  labelFormatter?: (label: string, payload: TooltipPayloadItem[]) => React.ReactNode
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  formatter,
  nameKey,
}: ChartTooltipContentProps) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  const tooltipLabel = !hideLabel && label
    ? labelFormatter
      ? <div className="font-medium">{labelFormatter(label, payload)}</div>
      : <div className="font-medium">{config[label]?.label ?? label}</div>
    : null

  return (
    <div className={cn('border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl', className)}>
      {tooltipLabel}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = String(nameKey || item.name || item.dataKey || 'value')
          const itemConfig = config[key]
          const indicatorColor = item.payload?.fill || item.color

          return (
            <div
              key={index}
              className={cn('flex w-full items-center gap-2', indicator === 'dot' && 'items-center')}
            >
              {itemConfig?.icon ? (
                <itemConfig.icon />
              ) : !hideIndicator ? (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: indicatorColor }}
                />
              ) : null}
              <div className="flex flex-1 justify-between items-center leading-none">
                <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
                {item.value !== undefined && (
                  <span className="text-foreground font-mono font-medium tabular-nums ml-4">
                    {formatter
                      ? formatter(item.value, item.name ?? '')
                      : item.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

const ChartLegend = Legend

interface LegendPayloadItem {
  value?: string | number
  dataKey?: string | number
  color?: string
  type?: string
}

interface ChartLegendContentProps extends React.ComponentProps<'div'> {
  payload?: LegendPayloadItem[]
  verticalAlign?: 'top' | 'middle' | 'bottom'
  hideIcon?: boolean
  nameKey?: string
}

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: ChartLegendContentProps) {
  const { config } = useChart()

  if (!payload?.length) return null

  return (
    <div className={cn('flex items-center justify-center gap-4', verticalAlign === 'top' ? 'pb-3' : 'pt-3', className)}>
      {payload.map((item: LegendPayloadItem, i: number) => {
        const key = String(nameKey || item.dataKey || 'value')
        const itemConfig = config[key] ?? config[String(item.value)]

        return (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            )}
            <span>{itemConfig?.label ?? item.value}</span>
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
