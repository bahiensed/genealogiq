'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { MapPin } from 'lucide-react'
import { deceasedResolver, deceasedDefaultValues, type DeceasedFormValues } from '@/schemas/deceased.schema'
import { GENDERS } from '@/schemas/app-user.schema'
import { createDeceased, updateDeceased } from '@/actions/deceased.actions'
import { COUNTRIES } from '@/constants/countries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

interface MemorializedFormProps {
  /** Create mode: appUserId to link the new deceased to */
  appUserId?: string
  /** Edit mode: deceased record ID */
  id?: string
  defaultValues?: DeceasedFormValues
}

const GENDER_LABELS: Record<string, string> = {
  MALE:   'Masculino',
  FEMALE: 'Feminino',
  OTHER:  'Outro',
}

const SOCIAL_KEYS = ['fb', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube', 'outro', 'website'] as const
type SocialKey = typeof SOCIAL_KEYS[number]

function socialLabel(key: SocialKey): string {
  if (key === 'fb') return 'Facebook'
  if (key === 'x') return 'X (Twitter)'
  if (key === 'outro') return 'Outro'
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

  const { control, handleSubmit, setValue, formState: { isSubmitting, errors } } = form

  async function onSubmit(data: DeceasedFormValues) {
    setServerError(null)
    const result = isEditing
      ? await updateDeceased(id!, data)
      : await createDeceased(appUserId!, data)

    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(isEditing ? 'Perfil atualizado com sucesso.' : 'Perfil criado com sucesso.')
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

      {/* ── Dados pessoais ── */}
      <p className="text-sm font-medium">Dados pessoais</p>
      <FieldGroup>
        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="firstName"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-6" data-invalid={fieldState.invalid}>
                <FieldLabel>Nome:*</FieldLabel>
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
                <FieldLabel>Sobrenome:*</FieldLabel>
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
                <FieldLabel>Gênero:*</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
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
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-4" data-invalid={fieldState.invalid}>
                <FieldLabel>Nascimento:*</FieldLabel>
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
                <FieldLabel>País natal:*</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
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
            control={control}
            render={({ field }) => (
              <Field className="col-span-6">
                <FieldLabel>Cidade natal:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="birthState"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-6" data-invalid={fieldState.invalid}>
                <FieldLabel>Estado natal:*</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <FieldSeparator />

      {/* ── Falecimento ── */}
      <p className="text-sm font-medium">Falecimento</p>
      <FieldGroup>
        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="deathDate"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-4" data-invalid={fieldState.invalid}>
                <FieldLabel>Data de falecimento:*</FieldLabel>
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
                <FieldLabel>Cidade:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="deathState"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>Estado:</FieldLabel>
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
                <FieldLabel>País:*</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="deathCause"
            control={control}
            render={({ field }) => (
              <Field className="col-span-6">
                <FieldLabel>Causa:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <FieldSeparator />

      {/* ── Sepultamento ── */}
      <p className="text-sm font-medium">Sepultamento</p>
      <FieldGroup>
        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="burialDate"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>Data de sepultamento:</FieldLabel>
                <Input {...field} value={field.value ?? ''} type="date" />
              </Field>
            )}
          />
          <Controller
            name="burialSite"
            control={control}
            render={({ field }) => (
              <Field className="col-span-8">
                <FieldLabel>Local (cemitério/crematório):</FieldLabel>
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
                <FieldLabel>CEP:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="burialStreet"
            control={control}
            render={({ field }) => (
              <Field className="col-span-6">
                <FieldLabel>Logradouro:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="burialNumber"
            control={control}
            render={({ field }) => (
              <Field className="col-span-3">
                <FieldLabel>Número:</FieldLabel>
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
                <FieldLabel>Complemento:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="burialNeighborhood"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>Bairro:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="burialCity"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>Cidade:</FieldLabel>
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
                <FieldLabel>Estado:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
              </Field>
            )}
          />
          <Controller
            name="burialCountry"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>País:</FieldLabel>
                <Input {...field} value={field.value ?? ''} autoComplete="off" />
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
            <Button type="button" variant="outline" size="sm" className="w-full" title="Obter coordenadas automaticamente">
              <MapPin className="h-4 w-4" />
              GPS
            </Button>
          </div>
        </div>
      </FieldGroup>

      <FieldSeparator />

      {/* ── Redes sociais ── */}
      <p className="text-sm font-medium">Redes sociais</p>
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
      </FieldGroup>

      <FieldSeparator />

      {/* ── Notas ── */}
      <FieldGroup>
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
      </FieldGroup>

      {serverError && <FieldError>{serverError}</FieldError>}

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar perfil'}
        </Button>
        {isEditing && (
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Limpar
          </Button>
        )}
      </Field>
    </form>
  )
}
