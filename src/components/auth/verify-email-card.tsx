import Link from 'next/link'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'

interface Props {
  title: string
  description: string
  body: string
  buttonText: string
  buttonHref: string
  buttonVariant?: 'default' | 'outline'
}

export function VerifyEmailCard({
  title,
  description,
  body,
  buttonText,
  buttonHref,
  buttonVariant = 'default',
}: Props) {
  return (
    <AuthCard title={title} description={description}>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Button asChild variant={buttonVariant} className="w-full">
        <Link href={buttonHref}>{buttonText}</Link>
      </Button>
    </AuthCard>
  )
}
