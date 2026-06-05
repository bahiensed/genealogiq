'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { MapPin } from 'lucide-react'
import { deceasedResolver, deceasedDefaultValues, type DeceasedFormValues } from '@/schemas/deceased.schema'
import { createDeceased, updateDeceased } from '@/actions/deceased.actions'
import { GenderSelect } from '@/components/ui/gender-select'
import { CountrySelect } from '@/components/ui/country-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface MemorializedFormProps {
  /** Create mode: appUserId to link the new deceased to */
  appUserId?: string
  /** Edit mode: deceased record ID */
  id?: string
  defaultValues?: DeceasedFormValues
}

const SOCIAL_KEYS = ['fb', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube', 'otherSocial', 'website'] as const
type SocialKey = typeof SOCIAL_KEYS[number]

function socialLabel(key: SocialKey): string {
  if (key === 'fb') return 'Facebook'
  if (key === 'x') return 'X (Twitter)'
  if (key === 'otherSocial') return 'Other'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function MemorializedForm({ appUserId, id, defaultValues }: MemorializedFormProps) {
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<DeceasedFormValues>({
    resolver: deceasedResolver,
    defaultValues: defaultValues ?? deceasedDefaultValues,
  })

  const { control, handleSubmit, formState: { isSubmitting } } = form

  async function onSubmit(data: DeceasedFormValues) {
    setServerError(null)
    const result = isEditing
      ? await updateDeceased(id!, data)
      : await createDeceased(appUserId!, data)

    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(isEditing ? 'Profile updated successfully.' : 'Profile created successfully.')
      if (!isEditing) router.push(`/customers/${appUserId}`)
    }
  }

  function scrollToFirstError() {
    requestAnimationFrame(() => {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, scrollToFirstError)} className="flex flex-col gap-6 max-w-2xl">

      <Accordion type="multiple" defaultValue={['personal', 'death']} className="flex flex-col gap-2">

        {/* ── Personal data ── */}
        <AccordionItem value="personal" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">Personal data</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>First Name:*</FieldLabel>
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
                      <FieldLabel>Last Name:*</FieldLabel>
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
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>Gender:</FieldLabel>
                      <GenderSelect value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="birthDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>Birth date:*</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="birthCountry"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>Birth country:*</FieldLabel>
                      <CountrySelect value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
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
                    <Field className="col-span-6">
                      <FieldLabel>Birth city:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="birthState"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>Birth state:*</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>

        {/* ── Death ── */}
        <AccordionItem value="death" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">Death</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="deathDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>Death date:*</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="deathCity"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>City:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="deathState"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>State:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="deathCountry"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>Country:*</FieldLabel>
                      <CountrySelect value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="deathCause"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>Cause:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>

        {/* ── Burial ── */}
        <AccordionItem value="burial" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">Burial</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="burialDate"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>Burial date:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialSite"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-8">
                      <FieldLabel>Location (cemetery/crematorium):</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="burialZip"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-3">
                      <FieldLabel>ZIP:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialStreet"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>Street:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialNumber"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-3">
                      <FieldLabel>Number:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="burialComplement"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>Complement:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialNeighborhood"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>Neighborhood:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialCity"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>City:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="burialState"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>State:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialCountry"
                  control={control}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>Country:</FieldLabel>
                      <CountrySelect value={field.value} onChange={field.onChange} />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="burialLatitude"
                  control={control}
                  render={({ field }) => (
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
                  )}
                />
                <Controller
                  name="burialLongitude"
                  control={control}
                  render={({ field }) => (
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
                  )}
                />
                <div className="col-span-2 flex items-end">
                  <Button type="button" variant="outline" size="sm" className="w-full" title="Get coordinates automatically">
                    <MapPin className="h-4 w-4" />
                    GPS
                  </Button>
                </div>
              </div>
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>

        {/* ── Social media + Notes ── */}
        <AccordionItem value="social" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">Social media</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <div className="grid grid-cols-12 gap-3">
                {SOCIAL_KEYS.map((key) => (
                  <Controller
                    key={key}
                    name={key}
                    control={control}
                    render={({ field }) => (
                      <Field className="col-span-6 md:col-span-4">
                        <FieldLabel>{socialLabel(key)}:</FieldLabel>
                        <Input {...field} value={field.value ?? ''} autoComplete="off" />
                      </Field>
                    )}
                  />
                ))}
              </div>

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

      </Accordion>

      {serverError && <FieldError>{serverError}</FieldError>}

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create profile'}
        </Button>
        {isEditing && (
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
        )}
      </Field>
    </form>
  )
}
