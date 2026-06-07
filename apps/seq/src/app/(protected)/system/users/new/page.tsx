import { UserForm } from '@/components/users/user-form'

export default function NewUserPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        New user
      </h1>
      <UserForm />
    </div>
  )
}
