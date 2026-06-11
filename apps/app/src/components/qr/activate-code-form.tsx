'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Normalizes user input to the canonical code shape used by /qr/[genCode]:
// uppercase, alphanumeric only (drops hyphens, spaces, and any pasted noise).
function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function ActivateCodeForm() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizeCode(code)
    if (normalized.length < 6) {
      setError("Please enter a valid activation code.")
      return
    }
    // The /qr/[genCode] route resolves the code and shows notFound() if it does
    // not exist — no need to validate existence here.
    router.push(`/qr/${normalized}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">Activation code</Label>
        <Input
          id="code"
          name="code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (error) setError(null)
          }}
          placeholder="e.g. ABCD-1234-EFGH"
          autoComplete="off"
          autoCapitalize="characters"
          className="font-mono tracking-widest"
          aria-invalid={!!error}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Button type="submit" className="w-full">
        Continue
      </Button>
    </form>
  )
}
