import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { ShoppingCart, BarChart3, TrendingUp, Banknote, DollarSign, CircleDollarSign, Building2, IdCard, Layers, QrCode, ArrowUpRight, Trophy, UserPlus } from 'lucide-react'
import { verifySession } from '@/lib/dal'
import { getDashboardStats } from '@/queries/dashboard'
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription } from '@genealogiq/ui/card'
import { MonthlyRevenueChart } from '@/components/dashboard/monthly-revenue-chart'
import { RevenueByPackageChart } from '@/components/dashboard/revenue-by-package-chart'
import { CustomerGrowthChart } from '@/components/dashboard/customer-growth-chart'
import { TopSellersCard } from '@/components/dashboard/top-sellers-card'

export default async function DashboardPage() {
  await verifySession()
  const stats = await getDashboardStats()
  const t = await getTranslations('Dashboard')
  const locale = await getLocale()
  const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {t('title')}
      </h1>

      {/* Row 1 — Sales count */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('monthlySales')}</CardTitle>
            <CardAction><ShoppingCart className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.monthlyCount}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('salesThisMonth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('annualSales')}</CardTitle>
            <CardAction><BarChart3 className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.yearlyCount}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('salesThisYear')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('totalSales')}</CardTitle>
            <CardAction><TrendingUp className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCount}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('allTimeSales')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Revenue */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('monthlyRevenue')}</CardTitle>
            <CardAction><Banknote className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{usd.format(stats.monthlyRevenue)}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('revenueThisMonth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('annualRevenue')}</CardTitle>
            <CardAction><DollarSign className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{usd.format(stats.yearlyRevenue)}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('revenueThisYear')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('totalRevenue')}</CardTitle>
            <CardAction><CircleDollarSign className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{usd.format(stats.totalRevenue)}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('allTimeRevenue')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('charts.monthlyRevenue')}</CardTitle>
            <CardDescription>{t('charts.last12ActiveSales')}</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyRevenueChart data={stats.monthlyRevenueChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('charts.revenueByProduct')}</CardTitle>
            <CardDescription>{t('charts.last12ActiveSales')}</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueByPackageChart data={stats.revenueByPackageChart} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3.5 — Growth insights */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle><UserPlus className="inline h-5 w-5 mr-2 align-text-bottom" />{t('charts.newCustomers')}</CardTitle>
            <CardDescription>{t('charts.newCustomersDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerGrowthChart data={stats.customerGrowthChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><Trophy className="inline h-5 w-5 mr-2 align-text-bottom" />{t('charts.topSellers')}</CardTitle>
            <CardDescription>{t('charts.topSellersDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <TopSellersCard data={stats.topSellersChart} />
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Entities */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/customers" className="inline-flex items-center gap-1 hover:underline">
                {t('entities.customers')} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardTitle>
            <CardAction><Building2 className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.customers}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('entities.customersDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/system/users" className="inline-flex items-center gap-1 hover:underline">
                {t('entities.systemUsers')} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardTitle>
            <CardAction><IdCard className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.systemUsers}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('entities.systemUsersDesc')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 5 — Catalog */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/subscriptions" className="inline-flex items-center gap-1 hover:underline">
                {t('entities.subscriptions')} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardTitle>
            <CardAction><Layers className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.subscriptions}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('entities.subscriptionsDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/gencodes" className="inline-flex items-center gap-1 hover:underline">
                {t('entities.products')} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardTitle>
            <CardAction><QrCode className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.packages}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('entities.productsDesc')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
