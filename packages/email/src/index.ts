import { Resend } from "resend"

// Canonical transactional emails for all three apps. One transport, one set of
// English templates; the only per-app variation is the link base URL (and the
// product name on the welcome email). Each app's lib/email.ts is a thin adapter
// that injects its own *_URL.

const FROM = "no-reply@rohling.com.br"

let client: Resend | undefined
function resend(): Resend {
  // Lazy: importing this module never requires RESEND_API_KEY; only sending does.
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}

async function send(to: string, subject: string, html: string): Promise<void> {
  await resend().emails.send({ from: FROM, to, subject, html })
}

export interface TokenEmail {
  to: string
  token: string
  baseUrl: string
}

export function sendVerificationEmail({ to, token, baseUrl }: TokenEmail): Promise<void> {
  const url = `${baseUrl}/verify-email?token=${token}`
  return send(to, "Confirm your email", `
    <p>Thank you for creating your account.</p>
    <p>Click the link below to confirm your email (expires in 24h):</p>
    <p><a href="${url}">Confirm email</a></p>
    <p>If you did not create this account, ignore this email.</p>
  `)
}

export function sendEmailChangeEmail({ to, token, baseUrl }: TokenEmail): Promise<void> {
  const url = `${baseUrl}/verify-email?token=${token}`
  return send(to, "Confirm your new email", `
    <p>We received a request to change the email address on your account.</p>
    <p>Click the link below to confirm the new address (expires in 1h):</p>
    <p><a href="${url}">Confirm new email</a></p>
    <p>If you did not request this, ignore this email.</p>
  `)
}

export function sendPasswordResetEmail({ to, token, baseUrl }: TokenEmail): Promise<void> {
  const url = `${baseUrl}/reset-password?token=${token}`
  return send(to, "Password reset", `
    <p>We received a request to reset your password.</p>
    <p>Click the link below to create a new password (expires in 1h):</p>
    <p><a href="${url}">Reset password</a></p>
    <p>If you did not request this, please ignore this email.</p>
  `)
}

export function sendAccountDeletionEmail({ to }: { to: string }): Promise<void> {
  return send(to, "Your account has been deleted", `
    <p>Your account has been successfully deleted.</p>
    <p>We'll miss you. If you ever want to return, we'll be here.</p>
    <p>If you did not request account deletion, contact us immediately.</p>
  `)
}

export function sendWelcomeEmail({
  to,
  token,
  baseUrl,
  productName,
}: TokenEmail & { productName?: string }): Promise<void> {
  const url = `${baseUrl}/reset-password?token=${token}`
  const subject = productName ? `Welcome to ${productName}! Set up your access` : "Welcome! Set up your access"
  return send(to, subject, `
    <p>Your account was created by an administrator.</p>
    <p>Click the link below to set your password and access the system (expires in 72h):</p>
    <p><a href="${url}">Set up password</a></p>
    <p>If you were not expecting this email, please contact your administrator.</p>
  `)
}
