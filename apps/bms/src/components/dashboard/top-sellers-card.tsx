import { Avatar, AvatarFallback } from '@genealogiq/ui/avatar'
import { getInitials } from '@/lib/utils'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

interface Props {
  data: { name: string; count: number; revenue: number }[]
}

export function TopSellersCard({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No sales in the last 12 months.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((seller, i) => (
        <li key={`${seller.name}-${i}`} className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback>{getInitials(seller.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{seller.name}</p>
            <p className="text-xs text-muted-foreground">{seller.count} sale{seller.count === 1 ? '' : 's'}</p>
          </div>
          <p className="text-sm font-semibold tabular-nums">{usd.format(seller.revenue)}</p>
        </li>
      ))}
    </ul>
  )
}
