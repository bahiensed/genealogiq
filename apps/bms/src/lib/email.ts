import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.BMS_URL}/verify-email?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Confirme seu e-mail",
    html: `
      <p>Obrigado por criar sua conta.</p>
      <p>Clique no link abaixo para confirmar seu e-mail (expira em 24h):</p>
      <p><a href="${url}">Confirmar e-mail</a></p>
      <p>Se você não criou esta conta, ignore este e-mail.</p>
    `,
  })
}

export async function sendEmailChangeEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.BMS_URL}/verify-email?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Confirme seu novo e-mail",
    html: `
      <p>Recebemos uma solicitação para alterar o e-mail da sua conta.</p>
      <p>Clique no link abaixo para confirmar o novo endereço (expira em 1h):</p>
      <p><a href="${url}">Confirmar novo e-mail</a></p>
      <p>Se você não solicitou isso, ignore este e-mail.</p>
    `,
  })
}

export async function sendAccountDeletionEmail(to: string): Promise<void> {
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Sua conta foi excluída",
    html: `
      <p>Sua conta foi excluída com sucesso.</p>
      <p>Sentiremos muito a sua falta. Se quiser voltar algum dia, estaremos aqui.</p>
      <p>Se você não solicitou a exclusão da sua conta, entre em contato conosco imediatamente.</p>
    `,
  })
}

export async function sendWelcomeEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.BMS_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Bem-vindo! Configure seu acesso",
    html: `
      <p>Sua conta foi criada por um administrador.</p>
      <p>Clique no link abaixo para criar sua senha e acessar o sistema (expira em 72h):</p>
      <p><a href="${url}">Configurar senha</a></p>
      <p>Se você não esperava este e-mail, entre em contato com o administrador.</p>
    `,
  })
}

export async function sendSequoiaWelcomeEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.SEQUOIA_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Bem-vindo ao Sequoia! Configure seu acesso",
    html: `
      <p>Sua empresa foi cadastrada e sua conta de administrador foi criada.</p>
      <p>Clique no link abaixo para criar sua senha e acessar o sistema (expira em 72h):</p>
      <p><a href="${url}">Configurar senha</a></p>
      <p>Se você não esperava este e-mail, entre em contato com o administrador.</p>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.BMS_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "no-reply@rohling.com.br",
    to,
    subject: "Redefinição de senha",
    html: `
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p>Clique no link abaixo para criar uma nova senha (expira em 1h):</p>
      <p><a href="${url}">Redefinir senha</a></p>
      <p>Se você não solicitou isso, ignore este e-mail.</p>
    `,
  })
}
