'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { userResolver, userDefaultValues, ASSIGNABLE_ROLES, type UserFormValues } from '@/schemas/user.schema'
import { createUser, updateUser } from '@/actions/user.actions'
import { maskCpf, maskPhone } from '@/lib/masks'
import { PHONE_COUNTRY_CODES } from '@/constants/phone-country-codes'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Switch } from '@genealogiq/ui/switch'
import { MaskedInput } from '@genealogiq/ui/masked-input'
import { AddressSection } from '@/components/address/address-section'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@genealogiq/ui/select'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@genealogiq/ui/field'

const ROLE_LABELS: Record<string, string> = {
  OWNER:     'Owner',
  ADMIN:     'Admin',
  COMERCIAL: 'Comercial',
  FINANCE:   'Finance',
  USER:      'User',
}

interface UserFormProps {
  id?: string
  defaultValues?: UserFormValues
}

export function UserForm({ id, defaultValues }: UserFormProps) {
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<UserFormValues>({
    resolver: userResolver,
    defaultValues: defaultValues ?? userDefaultValues,
  })

  const { control, handleSubmit, setValue, formState: { isSubmitting, errors } } = form

  async function onSubmit(data: UserFormValues) {
    setServerError(null)
    const result = isEditing ? await updateUser(id, data) : await createUser(data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
      if (!isEditing) router.push('/users')
    }
  }

  function scrollToFirstError() {
    requestAnimationFrame(() => {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, scrollToFirstError)} className="flex flex-col gap-6 max-w-2xl">

      <FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="firstName"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>First Name:</FieldLabel>
                <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="lastName"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Last Name:</FieldLabel>
                <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>E-mail:</FieldLabel>
              <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="role"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Role:</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="nationalId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>CPF:</FieldLabel>
                <MaskedInput
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  maskFn={maskCpf}
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="birthDate"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Date of Birth:</FieldLabel>
                <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="phoneCountryCode"
            control={control}
            render={({ field }) => (
              <Field className="col-span-2">
                <FieldLabel>Country Code:</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHONE_COUNTRY_CODES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <Controller
            name="phone"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-4" data-invalid={fieldState.invalid}>
                <FieldLabel>Phone:</FieldLabel>
                <MaskedInput
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  maskFn={maskPhone}
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        {isEditing && (
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel htmlFor="isActive" className="cursor-pointer">Active user:</FieldLabel>
              </Field>
            )}
          />
        )}
      </FieldGroup>

      <FieldSeparator />

      <p className="text-sm font-medium">Address</p>
      <AddressSection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={control as any}
        setValue={setValue}
        errors={errors}
        prefix="address"
      />

      {serverError && <FieldError>{serverError}</FieldError>}

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create user'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </Field>
    </form>
  )
}
