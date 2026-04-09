import { verifyTenantSession, getCustomerModules } from '@/lib/dal'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { AppBreadcrumb } from '@/components/breadcrumb/breadcrumb'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { UserMenu } from '@/components/users/user-menu'

export default async function ProtectPagesLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await verifyTenantSession()
  const modules = await getCustomerModules()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "14rem",
          "--sidebar-width-mobile": "14rem",
        } as React.CSSProperties
      }
    >
    <AppSidebar modules={modules} />
        <div className="flex flex-col w-full min-h-screen">
          <div className="flex border-b items-center justify-between px-4 py-2 bg-sidebar">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <AppBreadcrumb />
            </div>
            <div className="flex gap-4 items-center">
              <ModeToggle />
              <UserMenu
                name={session?.user?.name}
                email={session?.user?.email}
                image={session?.user?.image}
              />
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-4">
            {children}
          </main>
        </div>
    </SidebarProvider>
  )
}
