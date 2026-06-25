'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

export function PurchaseStatusToast() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const t = useTranslations('Purchasing')
  const status = params.get('status')

  useEffect(() => {
    if (status === 'success') {
      toast.success(t('toasts.success'))
    } else if (status === 'cancel') {
      toast.info(t('toasts.canceled'))
    }
    if (status) router.replace(pathname)
  }, [status, pathname, router, t])

  return null
}
