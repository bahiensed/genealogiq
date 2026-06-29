import { cn } from '@/lib/utils'
import { Card, CardDescription, CardHeader } from '@genealogiq/ui/card'

interface StatCardProps {
  label: string
  value: number
  /** Extra classes for the number (e.g. an accent colour). */
  valueClassName?: string
}

export function StatCard({ label, value, valueClassName }: StatCardProps) {
  return (
    <Card size="sm" className="gap-2">
      <CardHeader>
        <CardDescription className="min-h-[2.5em] leading-snug whitespace-pre-line">{label}</CardDescription>
        {/* Plain <p> (like the dashboard cards) — CardTitle is force-shrunk to text-sm under size="sm". */}
        <p className={cn('text-center text-3xl font-bold tabular-nums', valueClassName)}>{value}</p>
      </CardHeader>
    </Card>
  )
}
