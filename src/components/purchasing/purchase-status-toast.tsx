'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function PurchaseStatusToast() {
  const router = useRouter()
  const params = useSearchParams()
  const status = params.get('status')

  useEffect(() => {
    if (status === 'success') {
      toast.success('Purchase complete — QR codes will appear shortly.')
    } else if (status === 'cancel') {
      toast.info('Purchase canceled.')
    }
    if (status) router.replace('/purchasing/packages')
  }, [status, router])

  return null
}
