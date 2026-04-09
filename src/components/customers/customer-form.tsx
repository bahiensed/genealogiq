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
  MALE:   'Masculino',
  FEMALE: 'Feminino',
  OTHER:  'Outro',
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-2xl">
      {serverError && <FieldError>{serverError}</FieldError>}

      {/* ── Dados pessoais ── */}
      <p className="text-sm font-medium">Dados pessoais</p>
      <FieldGroup>
        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="firstName"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-6" data-invalid={fieldState.invalid}>
                <FieldLabel>Nome:</FieldLabel>
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
                <FieldLabel>Sobrenome:</FieldLabel>
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
                <FieldLabel>Gênero:</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <FieldLabel>Data de Nascimento:</FieldLabel>
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
                <FieldLabel>Cidade natal:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="birthState"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>Estado natal:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="birthCountry"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>País natal:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <FieldSeparator />

      {/* ── Contato ── */}
      <p className="text-sm font-medium">Contato</p>
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
                <FieldLabel>DDI:</FieldLabel>
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
                <FieldLabel>Telefone:</FieldLabel>
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
              <FieldLabel>Categoria:</FieldLabel>
              <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
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
              <FieldLabel>Notas:</FieldLabel>
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
              <FieldLabel htmlFor="isActive" className="cursor-pointer">Cliente ativo</FieldLabel>
            </Field>
          )}
        />
      </FieldGroup>

      <FieldSeparator />

      {/* ── Endereço ── */}
      <p className="text-sm font-medium">Endereço</p>
      <AddressSection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={control as any}
        setValue={setValue}
        errors={errors}
        prefix="address"
      />

      <FieldSeparator />

      {/* ── Redes sociais ── */}
      <p className="text-sm font-medium">Redes sociais</p>
      <FieldGroup>
        <div className="grid grid-cols-12 gap-3">
          {(['fb', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube', 'website'] as const).map((key) => (
            <Controller
              key={key}
              name={key}
              control={control}
              render={({ field }) => (
                <Field className="col-span-6">
                  <FieldLabel className="capitalize">{key === 'fb' ? 'Facebook' : key === 'x' ? 'X (Twitter)' : key.charAt(0).toUpperCase() + key.slice(1)}:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" />
                </Field>
              )}
            />
          ))}
        </div>
      </FieldGroup>

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar alterações'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Limpar
        </Button>
      </Field>
    </form>
  )
}
