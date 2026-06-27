'use client'

import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getCompanySchema, type CompanyFormValues } from '@/schemas/company.schema'
import { updateCompany } from '@/actions/company.actions'
import { maskCnpj, maskPhone } from '@/lib/masks'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Switch } from '@genealogiq/ui/switch'
import { MaskedInput } from '@genealogiq/ui/masked-input'
import { AddressSection } from '@/components/address/address-section'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@genealogiq/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@genealogiq/ui/select'

const COUNTRY_CODE_OPTIONS = ['1', '52', '55'] as const

interface CompanyFormProps {
  id: string
  defaultValues: CompanyFormValues
}

export function CompanyForm({ id, defaultValues }: CompanyFormProps) {
  const t   = useTranslations('Company')
  const tc  = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<CompanyFormValues>({
    resolver: useMemo(() => zodResolver(getCompanySchema(tErr)), [tErr]),
    defaultValues,
  })

  const { control, handleSubmit, setValue, formState: { isSubmitting, errors } } = form

  async function onSubmit(data: CompanyFormValues) {
    setServerError(null)
    const result = await updateCompany(id, data)
    if (!result.ok) {
      setServerError(result.message)
    } else {
      toast.success(t('toasts.updated'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="scroll-m-20 text-2xl font-bold tracking-tight">{t('title')}</CardTitle>
        <CardAction>
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
                <FieldLabel htmlFor="isActive" className="cursor-pointer">{field.value ? t('fields.active') : t('fields.inactive')}</FieldLabel>
              </Field>
            )}
          />
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {serverError && <FieldError>{serverError}</FieldError>}

          <FieldGroup>
            <Controller
              name="legalName"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t('fields.legalName')}</FieldLabel>
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
                  <FieldLabel>{t('fields.tradeName')}</FieldLabel>
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
                  <FieldLabel>{t('fields.cnpj')}</FieldLabel>
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
                    <FieldLabel>{t('fields.stateRegistration')}</FieldLabel>
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
                    <FieldLabel>{t('fields.municipalRegistration')}</FieldLabel>
                    <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field className="col-span-12 sm:col-span-6" data-invalid={fieldState.invalid}>
                    <FieldLabel>{t('fields.email')}</FieldLabel>
                    <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="phoneCountryCode"
                control={control}
                render={({ field, fieldState }) => (
                  <Field className="col-span-4 sm:col-span-2" data-invalid={fieldState.invalid}>
                    <FieldLabel>{t('fields.countryCode')}</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODE_OPTIONS.map((code) => (
                          <SelectItem key={code} value={code}>{`+${code}`}</SelectItem>
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
                  <Field className="col-span-8 sm:col-span-4" data-invalid={fieldState.invalid}>
                    <FieldLabel>{t('fields.phone')}</FieldLabel>
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
              {isSubmitting ? tc('saving') : t('save')}
            </Button>
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              {tc('reset')}
            </Button>
          </Field>
        </form>
      </CardContent>
    </Card>
  )
}
