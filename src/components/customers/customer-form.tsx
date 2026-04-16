'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { appUserResolver, appUserDefaultValues, type AppUserFormValues, GENDERS } from '@/schemas/app-user.schema'
import { updateCustomer } from '@/actions/customer.actions'
import { maskPhone } from '@/lib/masks'
import { PHONE_COUNTRY_CODES } from '@/constants/phone-country-codes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { MaskedInput } from '@/components/ui/masked-input'
import { AddressSection } from '@/components/address/address-section'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'

interface Category {
  id: string
  name: string
}

interface CustomerFormProps {
  id: string
  defaultValues?: AppUserFormValues
  categories?: Category[]
}

const GENDER_LABELS: Record<string, string> = {
  MALE:   'Male',
  FEMALE: 'Female',
  OTHER:  'Other',
}

export function CustomerForm({ id, defaultValues, categories = [] }: CustomerFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<AppUserFormValues>({
    resolver: appUserResolver,
    defaultValues: defaultValues ?? appUserDefaultValues,
  })

  const { control, handleSubmit, setValue, formState: { isSubmitting, errors } } = form

  async function onSubmit(data: AppUserFormValues) {
    setServerError(null)
    const result = await updateCustomer(id, data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
    }
  }

  function scrollToFirstError() {
    requestAnimationFrame(() => {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, scrollToFirstError)} className="flex flex-col gap-6 max-w-2xl">

      {/* ── Personal data ── */}
      <p className="text-sm font-medium">Personal data</p>
      <FieldGroup>
        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="firstName"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-6" data-invalid={fieldState.invalid}>
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
              <Field className="col-span-6" data-invalid={fieldState.invalid}>
                <FieldLabel>Last Name:</FieldLabel>
                <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>Gender:</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>{GENDER_LABELS[g]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            name="birthDate"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-4" data-invalid={fieldState.invalid}>
                <FieldLabel>Date of Birth:</FieldLabel>
                <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="birthCity"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>Birth city:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="birthState"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>Birth state:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="birthCountry"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>Birth country:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <FieldSeparator />

      {/* ── Contact ── */}
      <p className="text-sm font-medium">Contact</p>
      <FieldGroup>
        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-6" data-invalid={fieldState.invalid}>
                <FieldLabel>E-mail:</FieldLabel>
                <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="phoneCountryCode"
            control={control}
            render={({ field }) => (
              <Field className="col-span-2">
                <FieldLabel>Country Code:</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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

        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Category:</FieldLabel>
              <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Notes:</FieldLabel>
              <Textarea {...field} value={field.value ?? ''} rows={3} />
            </Field>
          )}
        />

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
              <FieldLabel htmlFor="isActive" className="cursor-pointer">Active customer</FieldLabel>
            </Field>
          )}
        />
      </FieldGroup>

      <FieldSeparator />

      {/* ── Address ── */}
      <p className="text-sm font-medium">Address</p>
      <AddressSection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={control as any}
        setValue={setValue}
        errors={errors}
        prefix="address"
      />

      <FieldSeparator />

      {/* ── Social media ── */}
      <p className="text-sm font-medium">Social media</p>
      <FieldGroup>
        <div className="grid grid-cols-12 gap-3">
          {(['fb', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube', 'outro', 'website'] as const).map((key) => (
            <Controller
              key={key}
              name={key}
              control={control}
              render={({ field }) => (
                <Field className="col-span-6 md:col-span-4">
                  <FieldLabel>{key === 'fb' ? 'Facebook' : key === 'x' ? 'X (Twitter)' : key === 'outro' ? 'Other' : key.charAt(0).toUpperCase() + key.slice(1)}:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )}
            />
          ))}
        </div>
      </FieldGroup>

      {serverError && <FieldError>{serverError}</FieldError>}

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </Field>
    </form>
  )
}
