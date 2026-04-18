import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.SEQUOIA_URL}/verify-email?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Confirm your email",
    html: `
      <p>Thank you for creating your account.</p>
      <p>Click the link below to confirm your email (expires in 24h):</p>
      <p><a href="${url}">Confirm email</a></p>
      <p>If you did not create this account, please ignore this email.</p>
    `,
  })
}

export async function sendEmailChangeEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.SEQUOIA_URL}/verify-email?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Confirm your new email",
    html: `
      <p>We received a request to change the email address on your account.</p>
      <p>Click the link below to confirm the new address (expires in 1h):</p>
      <p><a href="${url}">Confirm new email</a></p>
      <p>If you did not request this, please ignore this email.</p>
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
      <p>We'll miss you. If you ever want to come back, we'll be here.</p>
      <p>If you did not request account deletion, please contact us immediately.</p>
    `,
  })
}

export async function sendWelcomeEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.SEQUOIA_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Welcome! Set up your access",
    html: `
      <p>Your account was created by an administrator.</p>
      <p>Click the link below to set your password and access the system (expires in 72h):</p>
      <p><a href="${url}">Set up password</a></p>
      <p>If you were not expecting this email, please contact your administrator.</p>
    `,
  })
}

export async function sendAppWelcomeEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.APP_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Welcome! Set up your app access",
    html: `
      <p>Your access account has been created.</p>
      <p>Click the link below to set your password and access the app (expires in 72h):</p>
      <p><a href="${url}">Set up password</a></p>
      <p>If you were not expecting this email, please contact us.</p>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.SEQUOIA_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Password reset",
    html: `
      <p>We received a request to reset your password.</p>
      <p>Click the link below to create a new password (expires in 1h):</p>
      <p><a href="${url}">Reset password</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  })
}
