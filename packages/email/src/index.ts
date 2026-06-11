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

// Shared Genealogiq consumer email body. Both the welcome (tenant-created access,
// link sets the password) and the self-sign-up verification (user already chose a
// password, link confirms the email) use the exact same brand copy — only the
// call-to-action block (intro line + button label) and the link differ.
function appConsumerBody(opts: {
  greeting: string
  ctaIntro: string
  url: string
  ctaLabel: string
}): string {
  return `
    <p>${opts.greeting}</p>
    <p>Seja bem-vindo à Genealogiq.</p>
    <p>A partir de agora, você não é apenas um usuário. Você se tornou um <strong>guardião de histórias</strong> que merecem continuar vivas.</p>
    <p>A maioria das memórias se perde com o tempo. Aqui, você muda esse destino.</p>
    <p>A Genealogiq foi criada para que famílias possam preservar, organizar e eternizar aquilo que realmente importa: a história de quem veio antes de nós. E agora, isso está nas suas mãos.</p>
    <p><strong>Para começar agora, siga esses passos simples:</strong></p>
    <p>${opts.ctaIntro}</p>
    <p><a href="${opts.url}">${opts.ctaLabel}</a></p>
    <p>Depois:</p>
    <ul>
      <li>Complete os seus dados de perfil.</li>
      <li>Crie o primeiro perfil de alguém especial.</li>
      <li>Adicione fotos ou memórias marcantes.</li>
      <li>Conecte essa pessoa à sua árvore familiar.</li>
    </ul>
    <p>Tudo isso leva menos de 2 minutos. Mas o impacto atravessa gerações.</p>
    <p>Se precisar de ajuda, estamos aqui.<br/>Bem-vindo ao início de algo maior que você.</p>
    <p>Equipe Genealogiq®️<br/><em>"As pessoas só morrem quando são esquecidas".</em></p>
  `
}

// Welcome email for an APP consumer (memorial guardian) — distinct copy/tone from
// the staff welcome above. Sent when a tenant registers/sells access to a
// consumer; the link sets their password.
export function sendAppConsumerWelcomeEmail({
  to,
  token,
  baseUrl,
  name,
  callbackUrl,
}: TokenEmail & { name?: string; callbackUrl?: string }): Promise<void> {
  // callbackUrl deep-links the consumer back to a destination (e.g. the physical
  // QR code /qr/<code>) after they create their password and sign in. Only the
  // physical-QR platform sale passes it; digital sales omit it.
  const cb = callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
  const url = `${baseUrl}/reset-password?token=${token}${cb}`
  const greeting = name ? `Olá ${name},` : "Olá,"
  return send(to, "Bem-vindo à Genealogiq — crie o seu acesso", appConsumerBody({
    greeting,
    ctaIntro: "Clique no link abaixo para criar a sua senha (expira em 72h):",
    url,
    ctaLabel: "Criar minha senha",
  }))
}

// Verification email for an APP consumer who signed up themselves. Same brand copy
// as the welcome above, but the account already has a password — the link only
// confirms the email (24h). callbackUrl threads the post-verification destination.
export function sendAppConsumerVerificationEmail({
  to,
  token,
  baseUrl,
  name,
  callbackUrl,
}: TokenEmail & { name?: string; callbackUrl?: string }): Promise<void> {
  const cb = callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
  const url = `${baseUrl}/verify-email?token=${token}${cb}`
  const greeting = name ? `Olá ${name},` : "Olá,"
  return send(to, "Bem-vindo à Genealogiq — confirme o seu e-mail", appConsumerBody({
    greeting,
    ctaIntro: "Clique no link abaixo para confirmar o seu e-mail (expira em 24h):",
    url,
    ctaLabel: "Confirmar meu e-mail",
  }))
}

// Welcome email for a Sequoia (SEQ) tenant staff member — distinct copy/tone from
// the generic staff welcome. Sent when an admin creates the staff account; the
// link sets their password.
export function sendSequoiaWelcomeEmail({
  to,
  token,
  baseUrl,
  name,
}: TokenEmail & { name?: string }): Promise<void> {
  const url = `${baseUrl}/reset-password?token=${token}`
  const greeting = name ? `Olá ${name},` : "Olá,"
  return send(to, "Bem-vindo à plataforma Sequoia — crie o seu acesso", `
    <p>${greeting}</p>
    <p>Seja bem-vindo à plataforma Sequoia.</p>
    <p>A partir de agora, sua empresa não oferece apenas serviços funerários. Você passa a entregar <strong>continuidade, memória e legado</strong> às famílias que atende.</p>
    <p>A Sequoia foi criada para transformar a forma como funerárias e cemitérios se conectam com seus clientes, trazendo tecnologia, organização e significado para um dos momentos mais delicados da vida.</p>
    <p>Você agora tem acesso a uma plataforma completa para:</p>
    <ul>
      <li>Gerenciar famílias e atendimentos;</li>
      <li>Adquirir novos Gen-codes e acumular pontos de Legado;</li>
      <li>Integrar o uso do Gen-Code no seu processo;</li>
      <li>Elevar o valor percebido dos seus serviços;</li>
      <li>Ver seu Ranking no Programa Guardiões do Legado.</li>
    </ul>
    <p><strong>Para começar agora:</strong></p>
    <p>Clique no link abaixo para criar a sua senha e acessar a plataforma (expira em 72h):</p>
    <p><a href="${url}">Criar minha senha</a></p>
    <p>Depois:</p>
    <ul>
      <li>Cadastre seu primeiro cliente;</li>
      <li>Gere o primeiro memorial digital.</li>
    </ul>
    <p>Simples, rápido e poderoso.</p>
    <p>Nos próximos dias, você receberá orientações práticas para implementar isso no seu atendimento com naturalidade e respeito.</p>
    <p>Você não está vendendo um produto. Você está entregando algo que permanece.</p>
    <p>Conte conosco nessa jornada.</p>
    <p>Equipe Sequoia | Genealogiq<br/><em>"Transformando o luto em legado"</em></p>
  `)
}
