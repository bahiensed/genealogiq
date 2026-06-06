'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  main,
  system,
  records,
  categories,
  purchasing,
  inventory,
  sales,
  finance,
  type MenuItem,
  type ModuleKey,
} from '@/components/sidebar/menu-items'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@genealogiq/ui/collapsible'
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
  SidebarSeparator,
} from '@genealogiq/ui/sidebar'

type Modules = Record<ModuleKey, boolean>

interface AppSidebarProps {
  modules: Modules | null
}

function visibleItems(items: MenuItem[], modules: Modules | null): MenuItem[] {
  return items.filter((item) => !item.moduleKey || (modules?.[item.moduleKey] ?? false))
}

export function AppSidebar({ modules }: AppSidebarProps) {
  const pathname = usePathname()

  const recordsItems    = visibleItems(records,    modules)
  const categoriesItems = visibleItems(categories, modules)
  const purchasingItems = visibleItems(purchasing, modules)
  const inventoryItems  = visibleItems(inventory,  modules)
  const financeItems    = visibleItems(finance,    modules)

  const groups = [
    { label: 'System',      items: system,          show: true                       },
    { label: 'Records',     items: recordsItems,    show: recordsItems.length > 0    },
    { label: 'Categories',  items: categoriesItems, show: categoriesItems.length > 0 },
    { label: 'Purchasing',  items: purchasingItems, show: true                       },
    { label: 'Inventory',   items: inventoryItems,  show: true                       },
    { label: 'Sales',       items: sales,           show: true                       },
    { label: 'Finance',     items: financeItems,    show: financeItems.length > 0    },
  ].filter((g) => g.show)

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-8 py-3">
        <Image
          src="/logo/sign-dark.png"
          alt="Logo"
          width={160}
          height={40}
          className="dark:hidden"
          priority
        />
        <Image
          src="/logo/sign-light.png"
          alt="Logo"
          width={160}
          height={40}
          className="hidden dark:block"
          priority
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {main.map((section, i) => (
              <div key={section[0].name}>
                {i > 0 && <SidebarSeparator className="my-1" />}
                <SidebarMenu>
                  {section.map((item) => (
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
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map((group) => (
          <Collapsible
            key={group.label}
            className="group/collapsible"
            defaultOpen={group.items.some((item) => pathname.startsWith(item.url))}
          >
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
