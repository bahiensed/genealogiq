import { redirect } from 'next/navigation'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { safeCallback } from '@/lib/safe-callback'

interface Props {
  searchParams: Promise<{ token?: string; callbackUrl?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, callbackUrl: rawCallback } = await searchParams

  if (!token) redirect("/forgot-password")

  return <ResetPasswordForm token={token} callbackUrl={safeCallback(rawCallback) ?? undefined} />
}
