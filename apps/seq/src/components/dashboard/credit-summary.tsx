'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Badge } from '@genealogiq/ui/badge'

interface Props {
  balance:  { total: number; general: number; committed: number; nextExpiry: Date | null }
  bySource: { source: string; quantity: number }[]
  contract: {
    status: string
    autoRenew: boolean
    planName: string
    allowance: number
    cycle: { startAt: Date; endAt: Date; graceEndAt: Date; status: string } | null
  } | null
  sellThrough:       { granted: number; consumed: number; rate: number | null }
  projectedRollover: { quantity: number; usedFounder: boolean } | null
}

/**
 * The partner's allowance, in the terms the contract uses.
 *
 * Deliberately never says a memorial can be switched off. A partner reading a
 * countdown next to the word "expira" will assume the families they already
 * served are at risk; they are not, and the copy has to keep saying so.
 */
export function CreditSummary({ balance, bySource, contract, sellThrough, projectedRollover }: Props) {
  const t = useTranslations('Credits')
  const format = useFormatter()

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('available')}</CardDescription>
          <CardTitle className="text-4xl tabular-nums">{balance.general}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground flex flex-col gap-1">
          {bySource.map((s) => (
            <div key={s.source} className="flex justify-between">
              <span>{t(`source.${s.source}` as 'source.ANNUAL')}</span>
              <span className="tabular-nums">{s.quantity}</span>
            </div>
          ))}
          {balance.committed > 0 && (
            <p className="pt-1">{t('committedNote', { count: balance.committed })}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('nextExpiry')}</CardDescription>
          <CardTitle className="text-2xl">
            {balance.nextExpiry ? format.dateTime(balance.nextExpiry, { dateStyle: 'medium' }) : '—'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {/* The one thing this panel must never imply. */}
          <p>{t('memorialsSafe')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('sellThrough')}</CardDescription>
          <CardTitle className="text-4xl tabular-nums">
            {sellThrough.rate === null ? '—' : `${Math.round(sellThrough.rate * 100)}%`}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {t('sellThroughDetail', { consumed: sellThrough.consumed, granted: sellThrough.granted })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('contract')}</CardDescription>
          <CardTitle className="text-2xl">{contract?.planName ?? '—'}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground flex flex-col gap-2">
          {contract ? (
            <>
              <Badge variant={contract.status === 'ACTIVE' ? 'default' : 'destructive'} className="w-fit">
                {t(`status.${contract.status}` as 'status.ACTIVE')}
              </Badge>
              {contract.cycle && (
                <span>{t('cycleEnds', { date: format.dateTime(contract.cycle.endAt, { dateStyle: 'medium' }) })}</span>
              )}
              {/* Shown before renewal, not discovered after it. */}
              {projectedRollover && (
                <span>
                  {projectedRollover.usedFounder
                    ? t('rolloverFounder', { count: projectedRollover.quantity })
                    : t('rolloverProjected', { count: projectedRollover.quantity })}
                </span>
              )}
            </>
          ) : (
            <span>{t('noContract')}</span>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
