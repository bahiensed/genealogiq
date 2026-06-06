import Image from 'next/image'
import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { Button } from '@genealogiq/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@genealogiq/ui/card'

interface Props {
  searchParams: Promise<{ sent?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { sent } = await searchParams

  if (sent === "true") {
    return (
      <div className="flex flex-col w-full max-w-sm">
        <div className="relative h-50 w-full">
          <Link href="/" className="relative block h-full w-full">
            <Image
              src="/logo/logo-dark.png"
              alt="Logo"
              fill
              sizes="(max-width: 400px) 100vw, 400px"
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/logo/logo-light.png"
              alt="Logo"
              fill
              sizes="(max-width: 400px) 100vw, 400px"
              className="hidden object-contain dark:block"
              priority
            />
          </Link>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Email sent</CardTitle>
            <CardDescription>
              If this email is registered, you will receive a link shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Check your inbox. The link expires in one hour.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-in">Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <ForgotPasswordForm />
}
