import Image from "next/image"
import type { ReactNode } from "react"

interface Props {
  title?:       string
  description?: string
  children:     ReactNode
}

export function AuthCard({ title, description, children }: Props) {
  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="flex flex-col items-center text-center mb-8">
        <Image
          src="/tree-dark.png"
          alt="Genealogiq"
          width={256}
          height={177}
          className="object-contain dark:hidden"
          style={{ height: "auto" }}
          priority
        />
        <Image
          src="/tree-light.png"
          alt="Genealogiq"
          width={256}
          height={177}
          className="hidden object-contain dark:block"
          style={{ height: "auto" }}
          priority
        />
      </div>
      <div className="glass-card rounded-2xl p-8 space-y-4">
        {(title || description) && (
          <div>
            {title && <h1 className="text-xl font-semibold">{title}</h1>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
