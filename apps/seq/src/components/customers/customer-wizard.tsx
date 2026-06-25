'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { MapPin } from 'lucide-react'
import { getAppUserSchema, appUserDefaultValues, type AppUserFormValues, GENDERS } from '@/schemas/app-user.schema'
import { getDeceasedSchema, deceasedDefaultValues, type DeceasedFormValues } from '@/schemas/deceased.schema'
import { createCustomerWithDeceased } from '@/actions/customer.actions'
import { maskPhone } from '@/lib/masks'
import { PHONE_COUNTRY_CODES } from '@/constants/phone-country-codes'
import { useLocale, useTranslations } from 'next-intl'
import { getLocalizedCountries } from '@genealogiq/core'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { MaskedInput } from '@genealogiq/ui/masked-input'
import { Progress } from '@genealogiq/ui/progress'
import { Card, CardContent } from '@genealogiq/ui/card'
import { AddressSection } from '@/components/address/address-section'
import { AddCustomerCategoryDialog } from '@/components/customer-categories/add-customer-category-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@genealogiq/ui/select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'

interface Category {
  id: string
  name: string
}

interface CustomerWizardProps {
  categories?: Category[]
}

const STEP_DEFS = [
  { section: 'customer', title: 'personal' },
  { section: 'customer', title: 'contact' },
  { section: 'customer', title: 'address' },
  { section: 'customer', title: 'social' },
  { section: 'deceased', title: 'personal' },
  { section: 'deceased', title: 'death' },
  { section: 'deceased', title: 'burial' },
  { section: 'deceased', title: 'social' },
] as const

const APP_USER_STEP_FIELDS: Record<number, (keyof AppUserFormValues)[]> = {
  0: ['firstName', 'lastName', 'gender', 'birthDate', 'birthCountry'],
  1: ['email', 'phone'],
  2: [],
  3: [],
}

const DECEASED_STEP_FIELDS: Record<number, (keyof DeceasedFormValues)[]> = {
  4: ['firstName', 'lastName', 'gender', 'birthDate', 'birthCountry', 'birthState'],
  5: ['deathDate', 'deathCountry'],
  6: [],
  7: [],
}

const SOCIAL_KEYS = ['fb', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube', 'otherSocial', 'website'] as const
type SocialKey = typeof SOCIAL_KEYS[number]

function socialLabel(key: SocialKey, otherLabel: string): string {
  if (key === 'fb') return 'Facebook'
  if (key === 'x') return 'X'
  if (key === 'otherSocial') return otherLabel
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function CustomerWizard({ categories = [] }: CustomerWizardProps) {
  const t  = useTranslations('Customers')
  const tc = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const countryOptions = getLocalizedCountries(useLocale())
  const [step, setStep] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)
  const router = useRouter()

  const GENDER_LABELS: Record<string, string> = {
    FEMALE: t('gender.female'),
    MALE:   t('gender.male'),
    OTHER:  t('gender.other'),
  }

  const STEPS = STEP_DEFS.map((s) => ({
    section: t(`wizardSections.${s.section}`),
    title:   t(`wizardSteps.${s.section}.${s.title}`),
  }))

  const appUserForm = useForm<AppUserFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver:       useMemo(() => zodResolver(getAppUserSchema(tErr)) as any, [tErr]),
    defaultValues:  appUserDefaultValues,
    mode:           'onBlur',
    reValidateMode: 'onChange',
  })

  const deceasedForm = useForm<DeceasedFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver:       useMemo(() => zodResolver(getDeceasedSchema(tErr)) as any, [tErr]),
    defaultValues:  deceasedDefaultValues,
    mode:           'onBlur',
    reValidateMode: 'onChange',
  })

  const isLastStep = step === STEPS.length - 1
  const isAppUserSection = step < 4

  function handleUseMyLocation() {
    if (!navigator.geolocation) { toast.error(t('geolocation.unsupported')); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        deceasedForm.setValue('burialLatitude',  pos.coords.latitude)
        deceasedForm.setValue('burialLongitude', pos.coords.longitude)
        toast.success(t('geolocation.detected'))
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED)
          toast.error(t('geolocation.denied'))
        else if (err.code === err.POSITION_UNAVAILABLE)
          toast.error(t('geolocation.unavailable'))
        else
          toast.error(t('geolocation.timeout'))
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  async function handleNext() {
    let valid = true

    if (isAppUserSection) {
      const fields = APP_USER_STEP_FIELDS[step]
      if (fields.length > 0) {
        valid = await appUserForm.trigger(fields)
        if (!valid)
          fields.forEach((f) => appUserForm.setValue(f, appUserForm.getValues(f), { shouldTouch: true, shouldValidate: false }))
      }
    } else {
      const fields = DECEASED_STEP_FIELDS[step]
      if (fields.length > 0) {
        valid = await deceasedForm.trigger(fields)
        if (!valid)
          fields.forEach((f) => deceasedForm.setValue(f, deceasedForm.getValues(f), { shouldTouch: true, shouldValidate: false }))
      }
    }

    if (valid) {
      // Pre-populate deathCountry from deceased birthCountry when moving to step 5
      if (step === 4) {
        const bc = deceasedForm.getValues('birthCountry')
        if (bc && !deceasedForm.getValues('deathCountry')) {
          deceasedForm.setValue('deathCountry', bc)
        }
      }
      setStep((s) => s + 1)
    }
  }

  async function handleSubmit() {
    const appUserValid = await appUserForm.trigger()
    const deceasedValid = await deceasedForm.trigger()
    if (!appUserValid || !deceasedValid) return

    setServerError(null)
    const result = await createCustomerWithDeceased(appUserForm.getValues(), deceasedForm.getValues())
    if (!result.ok) {
      setServerError(result.message)
    } else {
      if (result.message) toast.success(result.message)
      router.push('/customers')
    }
  }

  const { control: uc, setValue: uSetValue, formState: { errors: uErrors } } = appUserForm
  const { control: dc, formState: { errors: dErrors } } = deceasedForm

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Progress */}
      <Progress value={((step + 1) / STEPS.length) * 100} />
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {STEPS[step].section}
        </p>
        <h2 className="text-lg font-semibold">{STEPS[step].title}</h2>
      </div>

      {serverError && <FieldError>{serverError}</FieldError>}

      {/* ── Step 0: Customer personal data ── */}
      {step === 0 && (
        <Card>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="firstName"
                  control={uc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.firstNameRequired')}</FieldLabel>
                      <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="lastName"
                  control={uc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.lastNameRequired')}</FieldLabel>
                      <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="gender"
                  control={uc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.genderRequired')}</FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}><SelectValue placeholder={t('placeholders.select')} /></SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => (
                            <SelectItem key={g} value={g}>{GENDER_LABELS[g]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="birthDate"
                  control={uc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.birthDateRequired')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="birthCountry"
                  control={uc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.birthCountryRequired')}</FieldLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(v) => {
                          field.onChange(v)
                          uSetValue('address.country', v)
                        }}
                      >
                        <SelectTrigger aria-invalid={fieldState.invalid}><SelectValue placeholder={t('placeholders.select')} /></SelectTrigger>
                        <SelectContent>
                          {countryOptions.map((c) => (
                            <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="birthCity"
                  control={uc}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>{t('fields.birthCity')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="birthState"
                  control={uc}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>{t('fields.birthState')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Customer contact ── */}
      {step === 1 && (
        <Card>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="email"
                  control={uc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.emailRequired')}</FieldLabel>
                      <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="phoneCountryCode"
                  control={uc}
                  render={({ field }) => (
                    <Field className="col-span-2">
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
                  control={uc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.phoneRequired')}</FieldLabel>
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
                control={uc}
                render={({ field }) => (
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>{t('fields.category')}</FieldLabel>
                      <AddCustomerCategoryDialog
                        onCreated={(cat) => {
                          setLocalCategories((prev) => [...prev, cat])
                          field.onChange(cat.id)
                        }}
                      />
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
                control={uc}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{t('fields.notes')}</FieldLabel>
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Customer address ── */}
      {step === 2 && (
        <Card>
          <CardContent>
            <AddressSection
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              control={uc as any}
              setValue={uSetValue}
              errors={uErrors}
              prefix="address"
            />
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Customer social media ── */}
      {step === 3 && (
        <Card>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                {SOCIAL_KEYS.map((key) => (
                  <Controller
                    key={key}
                    name={key}
                    control={uc}
                    render={({ field }) => (
                      <Field className="col-span-6 md:col-span-4">
                        <FieldLabel>{socialLabel(key, t('social.other'))}:</FieldLabel>
                        <Input {...field} value={field.value ?? ''} autoComplete="off" />
                      </Field>
                    )}
                  />
                ))}
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Deceased personal data ── */}
      {step === 4 && (
        <Card>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="firstName"
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.firstNameRequired')}</FieldLabel>
                      <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="lastName"
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.lastNameRequired')}</FieldLabel>
                      <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="gender"
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.genderRequired')}</FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}><SelectValue placeholder={t('placeholders.select')} /></SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => (
                            <SelectItem key={g} value={g}>{GENDER_LABELS[g]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="birthDate"
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.birthDateRequired')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="birthCountry"
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.birthCountryRequired')}</FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}><SelectValue placeholder={t('placeholders.select')} /></SelectTrigger>
                        <SelectContent>
                          {countryOptions.map((c) => (
                            <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="birthCity"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>{t('fields.birthCity')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="birthState"
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.birthStateRequired')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="notes"
                control={dc}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{t('fields.notes')}</FieldLabel>
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Death ── */}
      {step === 5 && (
        <Card>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="deathDate"
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.deathDateRequired')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="deathCity"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>{t('fields.city')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="deathState"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>{t('fields.state')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="deathCountry"
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.countryRequired')}</FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}><SelectValue placeholder={t('placeholders.select')} /></SelectTrigger>
                        <SelectContent>
                          {countryOptions.map((c) => (
                            <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="deathCause"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>{t('fields.deathCause')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Step 6: Burial ── */}
      {step === 6 && (
        <Card>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="burialDate"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>{t('fields.burialDate')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialSite"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-8">
                      <FieldLabel>{t('fields.burialSite')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="burialZip"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-3">
                      <FieldLabel>{t('fields.zip')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialStreet"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>{t('fields.street')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialNumber"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-3">
                      <FieldLabel>{t('fields.number')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="burialComplement"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>{t('fields.complement')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialNeighborhood"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>{t('fields.neighborhood')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialCity"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>{t('fields.city')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="burialState"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>{t('fields.state')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialCountry"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>{t('fields.country')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="burialLatitude"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-5">
                      <FieldLabel>{t('fields.latitude')}</FieldLabel>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        autoComplete="off"
                      />
                    </Field>
                  )}
                />
                <Controller
                  name="burialLongitude"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-5">
                      <FieldLabel>{t('fields.longitude')}</FieldLabel>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        autoComplete="off"
                      />
                    </Field>
                  )}
                />
                <div className="col-span-2 flex items-end">
                  <Button type="button" variant="outline" size="sm" className="w-full" title={t('fields.gpsTitle')} onClick={handleUseMyLocation}>
                    <MapPin className="h-4 w-4" />
                    {t('fields.gps')}
                  </Button>
                </div>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Step 7: Deceased social media ── */}
      {step === 7 && (
        <Card>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                {SOCIAL_KEYS.map((key) => (
                  <Controller
                    key={key}
                    name={key}
                    control={dc}
                    render={({ field }) => (
                      <Field className="col-span-6 md:col-span-4">
                        <FieldLabel>{socialLabel(key, t('social.other'))}:</FieldLabel>
                        <Input {...field} value={field.value ?? ''} autoComplete="off" />
                      </Field>
                    )}
                  />
                ))}
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Navigation ── */}
      <Field orientation="horizontal">
        {step > 0 && (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
            {tc('back')}
          </Button>
        )}
        {isLastStep ? (
          <Button type="button" onClick={handleSubmit}>
            {t('createCustomer')}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext}>
            {tc('next')}
          </Button>
        )}
      </Field>
    </div>
  )
}
