'use client'

import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getAppUserSchema, appUserDefaultValues, type AppUserFormValues } from '@/schemas/app-user.schema'
import { GenderSelect } from '@/components/ui/gender-select'
import { CountrySelect } from '@/components/ui/country-select'
import { updateCustomer } from '@/actions/customer.actions'
import { maskPhone } from '@/lib/masks'
import { PHONE_COUNTRY_CODES } from '@/constants/phone-country-codes'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Switch } from '@genealogiq/ui/switch'
import { MaskedInput } from '@genealogiq/ui/masked-input'
import { AddressSection } from '@/components/address/address-section'
import { AddCustomerCategoryDialog } from '@/components/customer-categories/add-customer-category-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@genealogiq/ui/select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@genealogiq/ui/accordion'

interface Category {
  id: string
  name: string
}

interface CustomerFormProps {
  id: string
  name: string
  defaultValues?: AppUserFormValues
  categories?: Category[]
}

const SOCIAL_KEYS = ['fb', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube', 'otherSocial', 'website'] as const
type SocialKey = typeof SOCIAL_KEYS[number]

function socialLabel(key: SocialKey, otherLabel: string): string {
  if (key === 'fb') return 'Facebook'
  if (key === 'x') return 'X (Twitter)'
  if (key === 'otherSocial') return otherLabel
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function CustomerForm({ id, name, defaultValues, categories = [] }: CustomerFormProps) {
  const t  = useTranslations('Customers')
  const tc = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const [serverError,     setServerError]     = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)

  const form = useForm<AppUserFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: useMemo(() => zodResolver(getAppUserSchema(tErr)) as any, [tErr]),
    defaultValues: defaultValues ?? appUserDefaultValues,
  })

  const { control, handleSubmit, setValue, formState: { isSubmitting, errors } } = form

  async function onSubmit(data: AppUserFormValues) {
    setServerError(null)
    const result = await updateCustomer(id, data)
    if (!result.ok) {
      setServerError(result.message)
    } else if (result.message) {
      toast.success(result.message)
    }
  }

  function handleCategoryCreated(cat: { id: string; name: string }) {
    setLocalCategories((prev) => [...prev, cat])
    setValue('categoryId', cat.id)
  }

  function scrollToFirstError() {
    requestAnimationFrame(() => {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, scrollToFirstError)} className="flex flex-col gap-6 max-w-2xl">

      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">{name}</h1>
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
      </div>

      <Accordion type="multiple" defaultValue={['personal']} className="flex flex-col gap-2">

        {/* ── Personal data ── */}
        <AccordionItem value="personal" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">{t('sections.personal')}</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.firstName')}</FieldLabel>
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
                      <FieldLabel>{t('fields.lastName')}</FieldLabel>
                      <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Controller
                  name="gender"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.gender')}</FieldLabel>
                      <GenderSelect value={field.value} onChange={(v) => field.onChange(v || null)} invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="birthDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.birthDate')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Controller
                  name="birthCity"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>{t('fields.birthCity')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="birthState"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>{t('fields.birthState')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="birthCountry"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.birthCountry')}</FieldLabel>
                      <CountrySelect value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>

        {/* ── Contact ── */}
        <AccordionItem value="contact" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">{t('sections.contact')}</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{t('fields.email')}</FieldLabel>
                    <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <Controller
                  name="phoneCountryCode"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>{t('fields.countryCode')}</FieldLabel>
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
                    <Field className="col-span-2" data-invalid={fieldState.invalid}>
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

              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>{t('fields.category')}</FieldLabel>
                      <AddCustomerCategoryDialog onCreated={handleCategoryCreated} />
                    </div>
                    <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('placeholders.category')} />
                      </SelectTrigger>
                      <SelectContent>
                        {localCategories.map((cat) => (
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
                    <FieldLabel>{t('fields.notes')}</FieldLabel>
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
                  </Field>
                )}
              />
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>

        {/* ── Address ── */}
        <AccordionItem value="address" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">{t('sections.address')}</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <AddressSection
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              control={control as any}
              setValue={setValue}
              errors={errors}
              prefix="address"
            />
          </AccordionContent>
        </AccordionItem>

        {/* ── Social media ── */}
        <AccordionItem value="social" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">{t('sections.social')}</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SOCIAL_KEYS.map((key) => (
                  <Controller
                    key={key}
                    name={key}
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>{socialLabel(key, t('social.other'))}:</FieldLabel>
                        <Input {...field} value={field.value ?? ''} autoComplete="off" />
                      </Field>
                    )}
                  />
                ))}
              </div>
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      {serverError && <FieldError>{serverError}</FieldError>}

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? tc('saving') : tc('save')}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          {tc('reset')}
        </Button>
      </Field>
    </form>
  )
}
