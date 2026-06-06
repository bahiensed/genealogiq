import { notFound } from 'next/navigation'
import { getUser } from '@/queries/users'
import { UserForm } from '@/components/users/user-form'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(id)
  if (!user) notFound()

  return (
    <UserForm
        id={id}
        defaultValues={{
          firstName:        user.firstName,
          lastName:         user.lastName,
          email:            user.email,
          role:             user.role as 'OWNER' | 'ADMIN' | 'COMERCIAL' | 'FINANCE' | 'USER',
          nationalId:       user.nationalId       ?? '',
          birthDate:        user.birthDate ? user.birthDate.toISOString().slice(0, 10) : '',
          phoneCountryCode: user.phoneCountryCode,
          phone:            user.phone            ?? '',
          isActive:         user.isActive,
          address: user.address ? {
            zip:          user.address.zip          ?? '',
            street:       user.address.street       ?? '',
            number:       user.address.number       ?? '',
            complement:   user.address.complement   ?? '',
            neighborhood: user.address.neighborhood ?? '',
            city:         user.address.city         ?? '',
            state:        user.address.state        ?? '',
            country:      user.address.country      ?? 'BR',
          } : undefined,
        }}
      />
  )
}
