import { getTranslations } from 'next-intl/server'
import { UserForm } from '@/components/users/user-form'

export default async function NewUserPage() {
  const t = await getTranslations('Users')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {t('create')}
      </h1>
      <UserForm />
    </div>
  )
}
