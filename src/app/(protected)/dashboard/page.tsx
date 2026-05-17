import { Layers, Users, ShoppingCart, Banknote, TrendingUp, UserPlus, QrCode } from 'lucide-react'
import { verifyTenantSession } from '@/lib/dal'
import { getDashboardStats } from '@/queries/dashboard'
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription } from '@/components/ui/card'
import { MonthlyRevenueChart } from '@/components/dashboard/monthly-revenue-chart'
import { RevenueByPlanChart } from '@/components/dashboard/revenue-by-plan-chart'
import { CustomerGrowthChart } from '@/components/dashboard/customer-growth-chart'
import { QrConsumptionChart } from '@/components/dashboard/qr-consumption-chart'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default async function DashboardPage() {
  const { customerId } = await verifyTenantSession()
  const stats = await getDashboardStats(customerId)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        Dashboard
      </h1>

      {/* Row 1 — Inventory + Customers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Available QR Codes for Sale</CardTitle>
            <CardAction><Layers className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.availableQRCodes}</p>
            <p className="text-sm text-muted-foreground mt-1">Currently in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Customers</CardTitle>
            <CardAction><Users className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCustomers}</p>
            <p className="text-sm text-muted-foreground mt-1">Registered customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Monthly sales metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>QR Codes Sold this Month</CardTitle>
            <CardAction><ShoppingCart className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.monthlyCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Sales this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardAction><Banknote className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{usd.format(stats.monthlyRevenue)}</p>
            <p className="text-sm text-muted-foreground mt-1">Revenue this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Ticket</CardTitle>
            <CardAction><TrendingUp className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{usd.format(stats.averageTicket)}</p>
            <p className="text-sm text-muted-foreground mt-1">Avg. revenue per sale this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyRevenueChart data={stats.monthlyRevenueChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueByPlanChart data={stats.revenueByPlanChart} />
          </CardContent>
        </Card>
      </div>

      {/* Growth insights */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle><UserPlus className="inline h-5 w-5 mr-2 align-text-bottom" />New Customers</CardTitle>
            <CardDescription>New end customers per month · last 12 months</CardDescription>
            <CardAction><Users className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <CustomerGrowthChart data={stats.customerGrowthChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><QrCode className="inline h-5 w-5 mr-2 align-text-bottom" />QR Consumption</CardTitle>
            <CardDescription>QR codes sold per month · last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <QrConsumptionChart data={stats.qrConsumptionChart} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
