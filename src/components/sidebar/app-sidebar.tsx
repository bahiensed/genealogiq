'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  main,
  system,
  records,
  purchasing,
  inventory,
  sales,
  finance,
} from '@/components/sidebar/menu-items'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

interface Modules {
  moduleRecords:    boolean
  modulePurchasing: boolean
  moduleInventory:  boolean
  moduleFinance:    boolean
}

interface AppSidebarProps {
  modules: Modules | null
}

export function AppSidebar({ modules }: AppSidebarProps) {
  const pathname = usePathname()

  const groups = [
    { label: 'System',     items: system,     enabled: true },
    { label: 'Records',    items: records,    enabled: modules?.moduleRecords    ?? false },
    { label: 'Purchasing', items: purchasing, enabled: modules?.modulePurchasing ?? false },
    { label: 'Inventory',  items: inventory,  enabled: modules?.moduleInventory  ?? false },
    { label: 'Sales',      items: sales,      enabled: true },
    { label: 'Finance',    items: finance,    enabled: modules?.moduleFinance    ?? false },
  ].filter(g => g.enabled)

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <span className="font-bold text-sm">Sequoia</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map((group) => (
          <Collapsible key={group.label} className="group/collapsible" defaultOpen={group.items.some((item) => pathname.startsWith(item.url))}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger>
                  {group.label}
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={pathname === item.url}>
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
