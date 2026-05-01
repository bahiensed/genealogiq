'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const RESOLVABLE = ['users', 'customers', 'suppliers', 'subscriptions', 'packages', 'supplier-categories', 'customer-categories'] as const
type ResolvableType = (typeof RESOLVABLE)[number]

function formatSegment(segment: string): string {
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function useResolvedNames(segments: string[]) {
  const [names, setNames] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    const toResolve: { type: ResolvableType; id: string }[] = []

    segments.forEach((segment, index) => {
      const prev = segments[index - 1] as ResolvableType | undefined
      if (prev && RESOLVABLE.includes(prev)) {
        toResolve.push({ type: prev, id: segment })
      }
    })

    if (toResolve.length === 0) return

    toResolve.forEach(({ type, id }) => {
      fetch(`/api/entity-name?type=${type}&id=${id}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.name) {
            setNames((prev) => ({ ...prev, [id]: data.name }))
          }
        })
        .catch(() => {})
    })
  }, [segments.join('/')])

  return names
}

export function AppBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const resolvedNames = useResolvedNames(segments)

  if (segments.length === 0) return null

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = '/' + segments.slice(0, index + 1).join('/')
          const isLast = index === segments.length - 1
          const label = resolvedNames[segment] ?? formatSegment(segment)

          return (
            <React.Fragment key={href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
