'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getUserSchema, userDefaultValues, ASSIGNABLE_ROLES, type UserFormValues } from '@/schemas/user.schema'
import { createUser, updateUser } from '@/actions/user.actions'
import { maskCpf, maskPhoneByCountry } from '@/lib/masks'
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

const GENDER_OPTIONS = [
  { value: 'Female', labelKey: 'female' },
  { value: 'Male',   labelKey: 'male'   },
] as const

interface UserFormProps {
  id?: string
  defaultValues?: UserFormValues
}

export function UserForm({ id, defaultValues }: UserFormProps) {
  const t  = useTranslations('Users')
  const tc = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<UserFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: useMemo(() => zodResolver(getUserSchema(tErr)) as any, [tErr]),
    defaultValues: defaultValues ?? userDefaultValues,
  })

  const { control, handleSubmit, setValue, formState: { isSubmitting, errors } } = form
  const countryCode = form.watch('phoneCountryCode')

  async function onSubmit(data: UserFormValues) {
    setServerError(null)
    const result = isEditing ? await updateUser(id, data) : await createUser(data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
      if (!isEditing) router.push('/system/users')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {isEditing ? t('edit') : t('new')}
        </h1>
        {isEditing && (
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                <label htmlFor="isActive" className="text-sm cursor-pointer">{t('active')}</label>
              </div>
            )}
          />
        )}
      </div>

      {serverError && <FieldError>{serverError}</FieldError>}

      <FieldGroup>
        {/* Row 1: First Name | Last Name */}
        <div className="grid grid-cols-2 gap-3">
          <Controller name="firstName" control={control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('fields.firstName')}</FieldLabel>
              <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />

          <Controller name="lastName" control={control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('fields.lastName')}</FieldLabel>
              <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />
        </div>

        {/* Row 2: Gender | Date of Birth */}
        <div className="grid grid-cols-2 gap-3">
          <Controller name="gender" control={control} render={({ field }) => (
            <Field>
              <FieldLabel>{t('fields.gender')}</FieldLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{t(`gender.${g.labelKey}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )} />

          <Controller name="birthDate" control={control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('fields.birthDate')}</FieldLabel>
              <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />
        </div>

        {/* Row 3: CPF | Role */}
        <div className="grid grid-cols-2 gap-3">
          <Controller name="nationalId" control={control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('fields.cpf')}</FieldLabel>
              <MaskedInput
                value={field.value ?? ''}
                onChange={field.onChange}
                maskFn={maskCpf}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />

          <Controller name="role" control={control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('fields.role')}</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder={t('placeholders.role')} />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{t(`roles.${role}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />
        </div>

        {/* Row 4: Email | Country Code | Phone */}
        <div className="grid grid-cols-12 gap-3">
          <Controller name="email" control={control} render={({ field, fieldState }) => (
            <Field className="col-span-6" data-invalid={fieldState.invalid}>
              <FieldLabel>{t('fields.email')}</FieldLabel>
              <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />

          <Controller name="phoneCountryCode" control={control} render={({ field }) => (
            <Field className="col-span-2">
              <FieldLabel>{t('fields.countryCode')}</FieldLabel>
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
          )} />

          <Controller name="phone" control={control} render={({ field, fieldState }) => (
            <Field className="col-span-4" data-invalid={fieldState.invalid}>
              <FieldLabel>{t('fields.phone')}</FieldLabel>
              <MaskedInput
                value={field.value ?? ''}
                onChange={field.onChange}
                maskFn={(v) => maskPhoneByCountry(v, countryCode)}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />
        </div>
      </FieldGroup>

      <FieldSeparator />

      <p className="text-sm font-medium">{t('sections.address')}</p>
      <AddressSection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={control as any}
        setValue={setValue}
        errors={errors}
        prefix="address"
      />

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? (isEditing ? tc('saving') : tc('creating'))
            : (isEditing ? t('saveChanges') : t('create'))}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          {tc('reset')}
        </Button>
      </Field>
    </form>
  )
}
