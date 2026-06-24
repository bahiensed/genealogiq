import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Input } from '@genealogiq/ui/input'
import { Field, FieldDescription, FieldLabel } from '@genealogiq/ui/field'
import { ProfileForm } from '@/components/profile/profile-form'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { ChangeEmailDialog } from '@/components/auth/change-email-dialog'
import { ChangePasswordDialog } from '@/components/auth/change-password-dialog'
import { DeleteAccountDialog } from '@/components/auth/delete-account-dialog'
import { profileDefaultValues, type ProfileFormValues } from '@/schemas/profile.schema'

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return ''
  return date.toISOString().slice(0, 10)
}

export default async function ProfilePage() {
  const session = await verifySession()
  const t = await getTranslations('Profile')

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { address: true },
  })

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : (session.user?.name ?? '')
  const email    = user?.email ?? session.user?.email ?? ''
  const image    = user?.avatarUrl ?? session.user?.image ?? ''

  const defaultValues: ProfileFormValues = user
    ? {
        firstName:        user.firstName,
        lastName:         user.lastName,
        nationalId:       user.nationalId ?? '',
        birthDate:        toDateInputValue(user.birthDate),
        phoneCountryCode: user.phoneCountryCode,
        phone:            user.phone ?? '',
        address: user.address
          ? {
              zip:          user.address.zip          ?? '',
              street:       user.address.street       ?? '',
              number:       user.address.number       ?? '',
              complement:   user.address.complement   ?? '',
              neighborhood: user.address.neighborhood ?? '',
              city:         user.address.city         ?? '',
              state:        user.address.state        ?? '',
              country:      user.address.country      ?? 'BR',
            }
          : profileDefaultValues.address,
      }
    : profileDefaultValues

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <AvatarUpload defaultUrl={image} fullName={fullName} />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight truncate">{fullName || t('title')}</h1>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('sections.personal.title')}</CardTitle>
          <CardDescription>{t('sections.personal.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultValues={defaultValues} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('sections.account.title')}</CardTitle>
          <CardDescription>{t('sections.account.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel>{t('fields.email')}</FieldLabel>
            <Input value={email} readOnly disabled />
            <FieldDescription>{t('sections.account.emailHint')}</FieldDescription>
          </Field>
          <div className="flex flex-wrap gap-2">
            <ChangeEmailDialog />
            <ChangePasswordDialog />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-destructive/40 ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">{t('sections.danger.title')}</CardTitle>
          <CardDescription>{t('sections.danger.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  )
}
