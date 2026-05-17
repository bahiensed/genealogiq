import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
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
          <h1 className="text-3xl font-bold tracking-tight truncate">{fullName || 'Profile'}</h1>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>Update your name, document, and contact details.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultValues={defaultValues} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account &amp; security</CardTitle>
          <CardDescription>Manage your sign-in email and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input value={email} readOnly disabled />
            <FieldDescription>To change your email, use the button below — a confirmation link is sent to the new address.</FieldDescription>
          </Field>
          <div className="flex flex-wrap gap-2">
            <ChangeEmailDialog />
            <ChangePasswordDialog />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-destructive/40 ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Permanently delete your account and all related data.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  )
}
