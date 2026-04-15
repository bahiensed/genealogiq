import { prisma } from '@/lib/prisma'
import { VerifyEmailCard } from '@/components/auth/verify-email-card'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return (
      <VerifyEmailCard
        title="Verifique seu e-mail"
        description="E-mail de confirmação enviado."
        body="Clique no link que enviamos para confirmar. O link expira em 1 hora."
        buttonText="Ir para o login"
        buttonHref="/sign-in"
        buttonVariant="outline"
      />
    )
  }

  const record = await prisma.emailToken.findUnique({
    where: { token },
  })

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.emailToken.delete({ where: { token } })
    }
    return (
      <VerifyEmailCard
        title="Link inválido ou expirado"
        description="Este link de verificação não é válido ou já expirou."
        body="Solicite um novo link na página de perfil."
        buttonText="Ir para o login"
        buttonHref="/sign-in"
        buttonVariant="outline"
      />
    )
  }

  if (record.type === 'CHANGE') {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { email: record.newEmail!, emailVerified: new Date() },
      }),
      prisma.emailToken.delete({ where: { token } }),
    ])

    return (
      <VerifyEmailCard
        title="E-mail alterado!"
        description="Seu e-mail foi atualizado com sucesso."
        body="Faça login novamente com seu novo endereço de e-mail."
        buttonText="Entrar"
        buttonHref="/sign-in"
      />
    )
  }

  // VERIFICATION
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailToken.delete({ where: { token } }),
  ])

  return (
    <VerifyEmailCard
      title="E-mail confirmado!"
      description="Sua conta foi verificada com sucesso."
      body="Você já pode entrar com seu e-mail e senha."
      buttonText="Entrar"
      buttonHref="/sign-in"
    />
  )
}
