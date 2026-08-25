import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@genealogiq/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

interface Props {
  searchParams: Promise<{ sent?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { sent } = await searchParams
  const t = await getTranslations('Auth')

  if (sent === "true") {
    return (
      <div className="flex flex-col w-full max-w-sm">
        <div className="relative h-50 w-full">
          <Link href="/" className="relative block h-full w-full">
            <Image
              src="/logo/logo-dark.png"
              alt="Genealogiq"
              fill
              sizes="(max-width: 400px) 100vw, 400px"
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/logo/logo-light.png"
              alt="Genealogiq"
              fill
              sizes="(max-width: 400px) 100vw, 400px"
              className="hidden object-contain dark:block"
              priority
            />
          </Link>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t('sent.title')}</CardTitle>
            <CardDescription>
              {t('sent.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('sent.body')}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-in">{t('sent.backToSignIn')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <ForgotPasswordForm />
}
