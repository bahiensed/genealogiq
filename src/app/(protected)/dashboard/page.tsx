import { Layers, Users, ShoppingCart, Banknote, BarChart3, TrendingUp } from 'lucide-react'
import { verifyTenantSession } from '@/lib/dal'
import { getDashboardStats } from '@/queries/dashboard'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default async function DashboardPage() {
  const { customerId } = await verifyTenantSession()
  const stats = await getDashboardStats(customerId)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Licenças Disponíveis</CardTitle>
            <CardAction><Layers className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.availableLicenses}</p>
            <p className="text-sm text-muted-foreground mt-1">Em estoque no momento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total de Customers</CardTitle>
            <CardAction><Users className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCustomers}</p>
            <p className="text-sm text-muted-foreground mt-1">Clientes cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Licenças Vendidas no Mês</CardTitle>
            <CardAction><ShoppingCart className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.monthlyCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Vendas no mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faturamento Mensal</CardTitle>
            <CardAction><Banknote className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{usd.format(stats.monthlyRevenue)}</p>
            <p className="text-sm text-muted-foreground mt-1">Receita no mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Licenças Vendidas no Ano</CardTitle>
            <CardAction><BarChart3 className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.yearlyCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Vendas no ano atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faturamento Anual</CardTitle>
            <CardAction><TrendingUp className="h-5 w-5 text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{usd.format(stats.yearlyRevenue)}</p>
            <p className="text-sm text-muted-foreground mt-1">Receita no ano atual</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
