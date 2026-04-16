'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { companyResolver, type CompanyFormValues } from '@/schemas/company.schema'
import { updateCompany } from '@/actions/company.actions'
import { maskCnpj, maskPhone } from '@/lib/masks'
import { PHONE_COUNTRY_CODES } from '@/constants/phone-country-codes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { MaskedInput } from '@/components/ui/masked-input'
import { AddressSection } from '@/components/address/address-section'
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CompanyFormProps {
  id: string
  defaultValues: CompanyFormValues
}

export function CompanyForm({ id, defaultValues }: CompanyFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<CompanyFormValues>({
    resolver: companyResolver,
    defaultValues,
  })

  const { control, handleSubmit, setValue, formState: { isSubmitting, errors } } = form

  async function onSubmit(data: CompanyFormValues) {
    setServerError(null)
    const result = await updateCompany(id, data)
    if (result?.error) {
      setServerError(result.error)
    } else {
      toast.success('Data updated successfully.')
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
        <Controller
          name="legalName"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Company Name:</FieldLabel>
              <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="tradeName"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Trade Name:</FieldLabel>
              <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="taxId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>CNPJ:</FieldLabel>
              <MaskedInput
                value={field.value ?? ''}
                onChange={field.onChange}
                maskFn={maskCnpj}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="stateRegistration"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>State Registration:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="municipalRegistration"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Municipal Registration:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
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

        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="phoneCountryCode"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-2" data-invalid={fieldState.invalid}>
                <FieldLabel>Country Code:</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
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
              <FieldLabel htmlFor="isActive" className="cursor-pointer">Active company:</FieldLabel>
            </Field>
          )}
        />
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
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </Field>
    </form>
  )
}
