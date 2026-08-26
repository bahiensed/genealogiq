'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { main, system } from '@/components/sidebar/menu-items'
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
  useSidebar,
} from '@genealogiq/ui/sidebar'

export function AppSidebar() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  // The mobile sidebar is a Sheet overlaying the page — it does NOT close on its own
  // when a link navigates, so tapping a menu item loads the new page behind a sidebar
  // that is still covering it. Every navigating <Link> closes it; never the
  // CollapsibleTrigger, since expanding a group is not navigation. No-op on desktop.
  const closeOnMobileNav = () => {
    if (isMobile) setOpenMobile(false)
  }
  const t = useTranslations('Sidebar')

  const groups = [{ labelKey: 'groups.system', items: system }]

  return (
    <Sidebar>
      {/* ⬇️ altura fixa de 60px (igual ao header) + logo centralizada verticalmente */}
      <SidebarHeader className="flex h-[60px] justify-center border-b px-6">
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
              <div key={section[0].labelKey}>
                {i > 0 && <SidebarSeparator className="my-1" />}
                <SidebarMenu>
                  {section.map((item) => (
                    <SidebarMenuItem key={item.labelKey}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link href={item.url} onClick={closeOnMobileNav}>
                          <item.icon />
                          <span>{t(item.labelKey)}</span>
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
            key={group.labelKey}
            className="group/collapsible"
            defaultOpen={group.items.some((item) => pathname.startsWith(item.url))}
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger>
                  {t(group.labelKey)}
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.labelKey}>
                        <SidebarMenuButton asChild isActive={pathname === item.url}>
                          <Link href={item.url} onClick={closeOnMobileNav}>
                            <item.icon />
                            <span>{t(item.labelKey)}</span>
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
