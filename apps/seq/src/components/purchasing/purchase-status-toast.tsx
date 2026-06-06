'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function PurchaseStatusToast() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const status = params.get('status')

  useEffect(() => {
    if (status === 'success') {
      toast.success('Purchase complete — QR codes will appear shortly.')
    } else if (status === 'cancel') {
      toast.info('Purchase canceled.')
    }
    if (status) router.replace(pathname)
  }, [status, pathname, router])

  return null
}
