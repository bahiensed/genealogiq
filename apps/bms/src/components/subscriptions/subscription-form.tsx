'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getSubscriptionSchema, subscriptionDefaultValues, type SubscriptionFormValues } from '@/schemas/subscription.schema'
import { createSubscription, updateSubscription } from '@/actions/subscription.actions'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Switch } from '@genealogiq/ui/switch'
import { Field, FieldError, FieldLabel } from '@genealogiq/ui/field'
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
  const t  = useTranslations('Subscriptions')
  const tc = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<SubscriptionFormValues>({
    resolver: useMemo(() => zodResolver(getSubscriptionSchema(tErr)) as any, [tErr]),  // eslint-disable-line @typescript-eslint/no-explicit-any
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Controller
          name="code"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('fields.code')}</FieldLabel>
              <Input
                {...field}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
                disabled={isFreePlan}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                placeholder={t('placeholders.code')}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              <p className="text-xs text-muted-foreground">
                {isFreePlan ? t('hints.freeCodeReserved') : t('hints.code')}
              </p>
            </Field>
          )}
        />
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="lg:col-span-2">
              <FieldLabel>{t('fields.name')}</FieldLabel>
              <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <IntField control={control} name="maxProfiles" label={t('fields.maxProfiles')} min={1} />
        <IntField control={control} name="treeMaxMembers" label={t('fields.treeMaxMembers')} />
        <div />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <IntField control={control} name="bioMaxChars" label={t('fields.bioMaxChars')} />
        <IntField control={control} name="bioMaxImages" label={t('fields.bioMaxImages')} />
        <div />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <IntField control={control} name="galleryMaxImages" label={t('fields.galleryMaxImages')} />
        <IntField control={control} name="galleryMaxVideos" label={t('fields.galleryMaxVideos')} />
        <div />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SwitchField control={control} name="geolocationFullAccess" label={t('fields.geolocationFullAccess')} />
        <SwitchField control={control} name="qrCodeAccess" label={t('fields.qrCodeAccess')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <IntField
          control={control}
          name="termLength"
          label={t('fields.termLength')}
          helper={t('hints.termLength')}
        />
        <Controller
          name="price"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('fields.price')}</FieldLabel>
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
              <p className="text-xs text-muted-foreground">{t('hints.price')}</p>
            </Field>
          )}
        />
        <div />
      </div>

      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{t('fields.description')}</FieldLabel>
            <Textarea {...field} value={field.value ?? ''} rows={3} maxLength={256} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {serverError && <FieldError>{serverError}</FieldError>}
      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? tc('saving') : isEditing ? tc('save') : t('create')}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          {tc('reset')}
        </Button>
      </Field>
    </form>
  )
}
