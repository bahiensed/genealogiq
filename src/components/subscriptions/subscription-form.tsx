'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, type Control } from 'react-hook-form'
import { toast } from 'sonner'
import { subscriptionResolver, subscriptionDefaultValues, type SubscriptionFormValues } from '@/schemas/subscription.schema'
import { createSubscription, updateSubscription } from '@/actions/subscription.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { CurrencyInput } from '@/components/ui/currency-input'

interface SubscriptionFormProps {
  id?: string
  defaultValues?: SubscriptionFormValues
}

interface IntFieldProps {
  control: Control<SubscriptionFormValues>
  name: keyof SubscriptionFormValues
  label: string
  min?: number
  helper?: string
}

function IntField({ control, name, label, min = 0, helper }: IntFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>
          <Input
            type="number"
            step="1"
            min={min}
            value={typeof field.value === 'number' && !Number.isNaN(field.value) ? field.value : ''}
            onChange={(e) => field.onChange(e.target.valueAsNumber)}
            onBlur={field.onBlur}
            name={field.name}
            ref={field.ref}
            autoComplete="off"
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        </Field>
      )}
    />
  )
}

interface SwitchFieldProps {
  control: Control<SubscriptionFormValues>
  name: 'geolocationFullAccess' | 'qrCodeAccess' | 'isActive'
  label: string
}

function SwitchField({ control, name, label }: SwitchFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
          <label htmlFor={name} className="text-sm cursor-pointer select-none">{label}</label>
          <Switch id={name} checked={field.value as boolean} onCheckedChange={field.onChange} />
        </div>
      )}
    />
  )
}

export function SubscriptionForm({ id, defaultValues }: SubscriptionFormProps) {
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<SubscriptionFormValues>({
    resolver: subscriptionResolver,
    defaultValues: defaultValues ?? subscriptionDefaultValues,
  })

  const { control, handleSubmit, formState: { isSubmitting } } = form
  const isFreePlan = defaultValues?.code === 'FREE'

  async function onSubmit(data: SubscriptionFormValues) {
    setServerError(null)
    const result = isEditing
      ? await updateSubscription(id, data)
      : await createSubscription(data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
      if (!isEditing) router.push('/subscriptions')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {isEditing ? 'Edit Subscription' : 'New Subscription'}
        </h1>
        {isEditing && (
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
        )}
      </div>

      {/* Identity */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Identity</h2>
        <FieldGroup>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Controller
              name="code"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Code:</FieldLabel>
                  <Input
                    {...field}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    disabled={isFreePlan}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    placeholder="DECADE"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  <p className="text-xs text-muted-foreground">
                    {isFreePlan ? 'FREE plan code is reserved.' : 'Uppercase slug. Used by APP to identify the tier.'}
                  </p>
                </Field>
              )}
            />
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
                  <FieldLabel>Name:</FieldLabel>
                  <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
        </FieldGroup>
      </section>

      {/* Commercial */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Commercial</h2>
        <FieldGroup>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <IntField
              control={control}
              name="termLength"
              label="Term Length (in months):"
              helper="0 = Lifetime"
            />
            <IntField
              control={control}
              name="maxProfiles"
              label="Max Memo Profiles:"
              min={1}
            />
            <Controller
              name="price"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Price (US$):</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-muted-foreground">$</span>
                    <CurrencyInput
                      className="pl-7"
                      value={field.value}
                      onChange={field.onChange}
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                    />
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  <p className="text-xs text-muted-foreground">0 = Free</p>
                </Field>
              )}
            />
          </div>
        </FieldGroup>
      </section>

      {/* Feature limits */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Feature limits</h2>
        <FieldGroup>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <IntField control={control} name="treeMaxMembers" label="Family Tree max members:" />
            <IntField control={control} name="bioMaxChars" label="Bio max characters:" />
            <IntField control={control} name="bioMaxImages" label="Bio max images:" />
            <IntField control={control} name="galleryMaxImages" label="Gallery max images:" />
            <IntField control={control} name="galleryMaxVideos" label="Gallery max videos:" />
          </div>
        </FieldGroup>
      </section>

      {/* Feature flags */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Features</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SwitchField control={control} name="geolocationFullAccess" label="Geolocation full access (lat/lon)" />
          <SwitchField control={control} name="qrCodeAccess" label="QR-Code access" />
        </div>
      </section>

      {/* Description */}
      <FieldGroup>
        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Description:</FieldLabel>
              <Textarea {...field} value={field.value ?? ''} rows={3} maxLength={256} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      {serverError && <FieldError>{serverError}</FieldError>}
      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create subscription'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </Field>
    </form>
  )
}
