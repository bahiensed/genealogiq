'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { appUserResolver, appUserDefaultValues, type AppUserFormValues } from '@/schemas/app-user.schema'
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

function socialLabel(key: SocialKey): string {
  if (key === 'fb') return 'Facebook'
  if (key === 'x') return 'X (Twitter)'
  if (key === 'otherSocial') return 'Other'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function CustomerForm({ id, name, defaultValues, categories = [] }: CustomerFormProps) {
  const [serverError,     setServerError]     = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)

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
              <label htmlFor="isActive" className="text-sm cursor-pointer">Active?</label>
            </div>
          )}
        />
      </div>

      <Accordion type="multiple" defaultValue={['personal']} className="flex flex-col gap-2">

        {/* ── Personal data ── */}
        <AccordionItem value="personal" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">Personal data</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Controller
                  name="gender"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Gender:</FieldLabel>
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
                      <FieldLabel>Date of Birth:</FieldLabel>
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
                      <FieldLabel>Birth city:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="birthState"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Birth state:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="birthCountry"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Birth country:</FieldLabel>
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
          <AccordionTrigger className="text-base font-semibold">Contact</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
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

              <div className="grid grid-cols-3 gap-3">
                <Controller
                  name="phoneCountryCode"
                  control={control}
                  render={({ field }) => (
                    <Field>
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
                    <Field className="col-span-2" data-invalid={fieldState.invalid}>
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
                    <div className="flex items-center justify-between">
                      <FieldLabel>Category:</FieldLabel>
                      <AddCustomerCategoryDialog onCreated={handleCategoryCreated} />
                    </div>
                    <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
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
                    <FieldLabel>Notes:</FieldLabel>
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
                  </Field>
                )}
              />
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>

        {/* ── Address ── */}
        <AccordionItem value="address" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">Address</AccordionTrigger>
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
          <AccordionTrigger className="text-base font-semibold">Social media</AccordionTrigger>
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
                        <FieldLabel>{socialLabel(key)}:</FieldLabel>
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
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </Field>
    </form>
  )
}
