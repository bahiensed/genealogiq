import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.APP_URL}/verify-email?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Confirm your email",
    html: `
      <p>Thank you for creating your account.</p>
      <p>Click the link below to confirm your email (expires in 24h):</p>
      <p><a href="${url}">Confirm email</a></p>
      <p>If you did not create this account, ignore this email.</p>
    `,
  })
}

export async function sendEmailChangeEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.APP_URL}/verify-email?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Confirm your new email",
    html: `
      <p>We received a request to change the email address on your account.</p>
      <p>Click the link below to confirm the new address (expires in 1h):</p>
      <p><a href="${url}">Confirm new email</a></p>
      <p>If you did not request this, ignore this email.</p>
    `,
  })
}

export async function sendAccountDeletionEmail(to: string): Promise<void> {
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Your account has been deleted",
    html: `
      <p>Your account has been successfully deleted.</p>
      <p>We'll miss you. If you ever want to return, we'll be here.</p>
      <p>If you did not request account deletion, contact us immediately.</p>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.APP_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Password reset",
    html: `
      <p>We received a request to reset your password.</p>
      <p>Click the link below to create a new password (expires in 1h):</p>
      <p><a href="${url}">Reset password</a></p>
      <p>If you did not request this, ignore this email.</p>
    `,
  })
}
