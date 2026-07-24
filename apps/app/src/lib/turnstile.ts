const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

interface SiteverifyResponse {
  success: boolean
}

// Missing TURNSTILE_SECRET_KEY disables verification gracefully (dev without
// keys still works) — mirrors the VAPID env fallback in lib/push.ts. Never
// ship prod without a real secret set.
export async function verifyTurnstileToken(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY missing — verification skipped")
    return true
  }

  const response = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
  })
  if (!response.ok) return false

  const data = (await response.json()) as SiteverifyResponse
  return data.success === true
}
