'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { CheckIcon, MapPin } from 'lucide-react'
import { deceasedResolver, deceasedDefaultValues, type DeceasedFormValues } from '@/schemas/deceased.schema'
import { createDeceased } from '@/actions/deceased.actions'
import { GenderSelect } from '@/components/ui/gender-select'
import { CountrySelect } from '@/components/ui/country-select'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'
import { cn } from '@/lib/utils'

interface Props {
  appUserId: string
}

const SOCIAL_KEYS = ['fb', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube', 'otherSocial', 'website'] as const
type SocialKey = typeof SOCIAL_KEYS[number]

function socialLabel(key: SocialKey): string {
  if (key === 'fb') return 'Facebook'
  if (key === 'x') return 'X'
  if (key === 'otherSocial') return 'Other'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

const STEPS = [
  { title: 'Personal', desc: 'Name, gender & birth'  },
  { title: 'Death',    desc: 'Date, place & cause'   },
  { title: 'Burial',   desc: 'Site & location'       },
  { title: 'Social',   desc: 'Social media & notes'  },
]

type StepIndex = 0 | 1 | 2 | 3

const STEP_FIELDS: Record<StepIndex, (keyof DeceasedFormValues)[]> = {
  0: ['firstName', 'lastName', 'birthDate', 'birthCountry', 'birthState'],
  1: ['deathDate', 'deathCountry'],
  2: [],
  3: [],
}

export function MemorializedNewForm({ appUserId }: Props) {
  const [step, setStep]               = useState<StepIndex>(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<DeceasedFormValues>({
    resolver:       deceasedResolver,
    defaultValues:  deceasedDefaultValues,
    mode:           'onBlur',
    reValidateMode: 'onChange',
  })

  const { control, handleSubmit, trigger, formState: { isSubmitting } } = form

  async function goNext() {
    const fields = STEP_FIELDS[step]
    if (fields.length > 0) {
      const ok = await trigger(fields)
      if (!ok) {
        fields.forEach((f) => form.setValue(f, form.getValues(f), { shouldTouch: true, shouldValidate: false }))
        return
      }
    }
    setStep((s) => (s + 1) as StepIndex)
  }

  function goBack() {
    setStep((s) => (s - 1) as StepIndex)
  }

  async function onSubmit(data: DeceasedFormValues) {
    setServerError(null)
    const result = await createDeceased(appUserId, data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success('Profile created successfully.')
      router.push(`/customers/${appUserId}`)
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Stepper */}
      <nav aria-label="Form steps">
        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors',
                i < step   && 'bg-primary text-primary-foreground',
                i === step && 'ring-2 ring-primary bg-primary/10 text-primary',
                i > step   && 'bg-muted text-muted-foreground',
              )}>
                {i < step ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-px w-4 shrink-0', i < step ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          ))}
          <span className="ml-2 text-sm font-medium">{STEPS[step].title}</span>
          <span className="text-xs text-muted-foreground ml-1">— {STEPS[step].desc}</span>
        </div>

        {/* Desktop */}
        <ol className="hidden md:flex items-start gap-0">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                    i < step   && 'bg-primary text-primary-foreground',
                    i === step && 'ring-2 ring-primary ring-offset-2 bg-primary/10 text-primary',
                    i > step   && 'bg-muted text-muted-foreground',
                  )}>
                    {i < step ? <CheckIcon className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn('h-px flex-1 mx-3', i < step ? 'bg-primary' : 'bg-border')} />
                  )}
                </div>
                <div className="mt-2 pr-4">
                  <p className={cn('text-sm font-semibold', i === step ? 'text-foreground' : 'text-muted-foreground')}>{s.title}</p>
                  <p className="text-xs text-muted-foreground hidden lg:block">{s.desc}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">

        {/* ── Step 0: Personal ── */}
        {step === 0 && (
          <FieldGroup>
            <div className="grid grid-cols-12 gap-3">
              <Controller name="firstName" control={control} render={({ field, fieldState }) => (
                <Field className="col-span-6" data-invalid={fieldState.invalid}>
                  <FieldLabel>First Name:*</FieldLabel>
                  <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller name="lastName" control={control} render={({ field, fieldState }) => (
                <Field className="col-span-6" data-invalid={fieldState.invalid}>
                  <FieldLabel>Last Name:*</FieldLabel>
                  <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <Controller name="gender" control={control} render={({ field, fieldState }) => (
                <Field className="col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel>Gender:</FieldLabel>
                  <GenderSelect value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller name="birthDate" control={control} render={({ field, fieldState }) => (
                <Field className="col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel>Birth date:*</FieldLabel>
                  <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller name="birthCountry" control={control} render={({ field, fieldState }) => (
                <Field className="col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel>Birth country:*</FieldLabel>
                  <CountrySelect value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <Controller name="birthState" control={control} render={({ field, fieldState }) => (
                <Field className="col-span-6" data-invalid={fieldState.invalid}>
                  <FieldLabel>Birth state:*</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller name="birthCity" control={control} render={({ field }) => (
                <Field className="col-span-6">
                  <FieldLabel>Birth city:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
            </div>
          </FieldGroup>
        )}

        {/* ── Step 1: Death ── */}
        {step === 1 && (
          <FieldGroup>
            <div className="grid grid-cols-12 gap-3">
              <Controller name="deathDate" control={control} render={({ field, fieldState }) => (
                <Field className="col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel>Death date:*</FieldLabel>
                  <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller name="deathCity" control={control} render={({ field }) => (
                <Field className="col-span-4">
                  <FieldLabel>City:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
              <Controller name="deathState" control={control} render={({ field }) => (
                <Field className="col-span-4">
                  <FieldLabel>State:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <Controller name="deathCountry" control={control} render={({ field, fieldState }) => (
                <Field className="col-span-6" data-invalid={fieldState.invalid}>
                  <FieldLabel>Country:*</FieldLabel>
                  <CountrySelect value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller name="deathCause" control={control} render={({ field }) => (
                <Field className="col-span-6">
                  <FieldLabel>Cause:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
            </div>
          </FieldGroup>
        )}

        {/* ── Step 2: Burial ── */}
        {step === 2 && (
          <FieldGroup>
            <p className="text-sm text-muted-foreground">Burial information is optional and can be filled in later.</p>

            <div className="grid grid-cols-12 gap-3">
              <Controller name="burialDate" control={control} render={({ field }) => (
                <Field className="col-span-4">
                  <FieldLabel>Burial date:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} type="date" />
                </Field>
              )} />
              <Controller name="burialSite" control={control} render={({ field }) => (
                <Field className="col-span-8">
                  <FieldLabel>Location (cemetery/crematorium):</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <Controller name="burialZip" control={control} render={({ field }) => (
                <Field className="col-span-3">
                  <FieldLabel>ZIP:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
              <Controller name="burialStreet" control={control} render={({ field }) => (
                <Field className="col-span-6">
                  <FieldLabel>Street:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
              <Controller name="burialNumber" control={control} render={({ field }) => (
                <Field className="col-span-3">
                  <FieldLabel>Number:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <Controller name="burialComplement" control={control} render={({ field }) => (
                <Field className="col-span-4">
                  <FieldLabel>Complement:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
              <Controller name="burialNeighborhood" control={control} render={({ field }) => (
                <Field className="col-span-4">
                  <FieldLabel>Neighborhood:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
              <Controller name="burialCity" control={control} render={({ field }) => (
                <Field className="col-span-4">
                  <FieldLabel>City:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <Controller name="burialState" control={control} render={({ field }) => (
                <Field className="col-span-4">
                  <FieldLabel>State:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )} />
              <Controller name="burialCountry" control={control} render={({ field }) => (
                <Field className="col-span-4">
                  <FieldLabel>Country:</FieldLabel>
                  <CountrySelect value={field.value} onChange={field.onChange} />
                </Field>
              )} />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <Controller name="burialLatitude" control={control} render={({ field }) => (
                <Field className="col-span-5">
                  <FieldLabel>Latitude:</FieldLabel>
                  <Input
                    type="number"
                    step="any"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    autoComplete="off"
                  />
                </Field>
              )} />
              <Controller name="burialLongitude" control={control} render={({ field }) => (
                <Field className="col-span-5">
                  <FieldLabel>Longitude:</FieldLabel>
                  <Input
                    type="number"
                    step="any"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    autoComplete="off"
                  />
                </Field>
              )} />
              <div className="col-span-2 flex items-end">
                <Button type="button" variant="outline" size="sm" className="w-full" title="Get coordinates automatically">
                  <MapPin className="h-4 w-4" />
                  GPS
                </Button>
              </div>
            </div>
          </FieldGroup>
        )}

        {/* ── Step 3: Social ── */}
        {step === 3 && (
          <FieldGroup>
            <div className="grid grid-cols-12 gap-3">
              {SOCIAL_KEYS.map((key) => (
                <Controller key={key} name={key} control={control} render={({ field }) => (
                  <Field className="col-span-6 md:col-span-4">
                    <FieldLabel>{socialLabel(key)}:</FieldLabel>
                    <Input {...field} value={field.value ?? ''} autoComplete="off" />
                  </Field>
                )} />
              ))}
            </div>

            <Controller name="notes" control={control} render={({ field }) => (
              <Field>
                <FieldLabel>Notes:</FieldLabel>
                <Textarea {...field} value={field.value ?? ''} rows={3} />
              </Field>
            )} />
          </FieldGroup>
        )}

        {serverError && <FieldError>{serverError}</FieldError>}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
            Back
          </Button>

          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={() => handleSubmit(onSubmit)()} disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create profile'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
