import Image from 'next/image'
import Link from 'next/link'
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
    <div className="w-full max-w-md animate-fade-in">
      <div className="flex justify-center mb-8">
        <Image src="/tree-dark.png" alt="Genealogiq" width={256} height={256} className="object-contain dark:hidden" style={{ height: "auto" }} priority />
        <Image src="/tree-light.png" alt="Genealogiq" width={256} height={256} className="hidden object-contain dark:block" style={{ height: "auto" }} priority />
      </div>
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <p className="text-sm text-muted-foreground">{body}</p>
        <Button asChild variant={buttonVariant} className="w-full">
          <Link href={buttonHref}>{buttonText}</Link>
        </Button>
      </div>
    </div>
  )
}
