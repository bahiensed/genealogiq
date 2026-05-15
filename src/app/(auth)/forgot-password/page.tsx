import Link from 'next/link'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

interface Props {
  searchParams: Promise<{ sent?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { sent } = await searchParams

  if (sent === "true") {
    return (
      <AuthCard
        title="E-mail sent"
        description="If this email is registered, you will receive a link shortly."
      >
        <p className="text-sm text-muted-foreground">
          Check your inbox. The link expires in one hour.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </AuthCard>
    )
  }

  return <ForgotPasswordForm />
}
