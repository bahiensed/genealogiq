import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@genealogiq/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@genealogiq/ui/card'

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
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{body}</p>
        </CardContent>
        <CardFooter>
          <Button asChild variant={buttonVariant} className="w-full">
            <Link href={buttonHref}>{buttonText}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
