'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { MapPin } from 'lucide-react'
import { appUserResolver, appUserDefaultValues, type AppUserFormValues, GENDERS } from '@/schemas/app-user.schema'
import { deceasedResolver, deceasedDefaultValues, type DeceasedFormValues } from '@/schemas/deceased.schema'
import { createCustomerWithDeceased } from '@/actions/customer.actions'
import { maskPhone } from '@/lib/masks'
import { PHONE_COUNTRY_CODES } from '@/constants/phone-country-codes'
import { COUNTRIES } from '@/constants/countries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MaskedInput } from '@/components/ui/masked-input'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { AddressSection } from '@/components/address/address-section'
import { AddCustomerCategoryDialog } from '@/components/customer-categories/add-customer-category-dialog'
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
} from '@/components/ui/field'

interface Category {
  id: string
  name: string
}

interface CustomerWizardProps {
  categories?: Category[]
}

const GENDER_LABELS: Record<string, string> = {
  MALE:   'Masculino',
  FEMALE: 'Feminino',
  OTHER:  'Outro',
}

const STEPS = [
  { section: 'Cliente',   title: 'Dados pessoais' },
  { section: 'Cliente',   title: 'Contato' },
  { section: 'Cliente',   title: 'Endereço' },
  { section: 'Cliente',   title: 'Redes sociais' },
  { section: 'Falecido',  title: 'Dados pessoais' },
  { section: 'Falecido',  title: 'Falecimento' },
  { section: 'Falecido',  title: 'Sepultamento' },
  { section: 'Falecido',  title: 'Redes sociais' },
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

const SOCIAL_KEYS = ['fb', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube', 'outro', 'website'] as const
type SocialKey = typeof SOCIAL_KEYS[number]

function socialLabel(key: SocialKey): string {
  if (key === 'fb') return 'Facebook'
  if (key === 'x') return 'X (Twitter)'
  if (key === 'outro') return 'Outro'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function CustomerWizard({ categories = [] }: CustomerWizardProps) {
  const [step, setStep] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)
  const router = useRouter()

  const appUserForm = useForm<AppUserFormValues>({
    resolver: appUserResolver,
    defaultValues: appUserDefaultValues,
  })

  const deceasedForm = useForm<DeceasedFormValues>({
    resolver: deceasedResolver,
    defaultValues: deceasedDefaultValues,
  })

  const isLastStep = step === STEPS.length - 1
  const isAppUserSection = step < 4

  async function handleNext() {
    let valid = true

    if (isAppUserSection) {
      const fields = APP_USER_STEP_FIELDS[step]
      if (fields.length > 0) {
        valid = await appUserForm.trigger(fields)
      }
    } else {
      const fields = DECEASED_STEP_FIELDS[step]
      if (fields.length > 0) {
        valid = await deceasedForm.trigger(fields)
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
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
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

      {/* ── Step 0: Dados pessoais do cliente ── */}
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
                      <FieldLabel>Nome:*</FieldLabel>
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
                  control={uc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>Gênero:*</FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                      <FieldLabel>Nascimento:*</FieldLabel>
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
                      <FieldLabel>País natal:*</FieldLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(v) => {
                          field.onChange(v)
                          uSetValue('address.country', v)
                        }}
                      >
                        <SelectTrigger aria-invalid={fieldState.invalid}><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                  control={uc}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>Cidade natal:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="birthState"
                  control={uc}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>Estado natal:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Contato do cliente ── */}
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
                      <FieldLabel>E-mail:*</FieldLabel>
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
                  control={uc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>Telefone:*</FieldLabel>
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
                      <FieldLabel>Categoria:</FieldLabel>
                      <AddCustomerCategoryDialog
                        onCreated={(cat) => {
                          setLocalCategories((prev) => [...prev, cat])
                          field.onChange(cat.id)
                        }}
                      />
                    </div>
                    <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
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
                    <FieldLabel>Notas:</FieldLabel>
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Endereço do cliente ── */}
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

      {/* ── Step 3: Redes sociais do cliente ── */}
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
                        <FieldLabel>{socialLabel(key)}:</FieldLabel>
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

      {/* ── Step 4: Dados pessoais do falecido ── */}
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
                      <FieldLabel>Nome:*</FieldLabel>
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
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>Gênero:*</FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                      <FieldLabel>Nascimento:*</FieldLabel>
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
                      <FieldLabel>País natal:*</FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>Cidade natal:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="birthState"
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>Estado natal:*</FieldLabel>
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
                    <FieldLabel>Notas:</FieldLabel>
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Falecimento ── */}
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
                      <FieldLabel>Data de falecimento:*</FieldLabel>
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
                      <FieldLabel>Cidade:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="deathState"
                  control={dc}
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
                  control={dc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-6" data-invalid={fieldState.invalid}>
                      <FieldLabel>País:*</FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>Causa:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* ── Step 6: Sepultamento ── */}
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
                      <FieldLabel>Data de sepultamento:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialSite"
                  control={dc}
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
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-3">
                      <FieldLabel>CEP:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialStreet"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-6">
                      <FieldLabel>Logradouro:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialNumber"
                  control={dc}
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
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>Complemento:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialNeighborhood"
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>Bairro:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialCity"
                  control={dc}
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
                  control={dc}
                  render={({ field }) => (
                    <Field className="col-span-4">
                      <FieldLabel>Estado:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
                <Controller
                  name="burialCountry"
                  control={dc}
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
                  control={dc}
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
                  control={dc}
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
          </CardContent>
        </Card>
      )}

      {/* ── Step 7: Redes sociais do falecido ── */}
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
                        <FieldLabel>{socialLabel(key)}:</FieldLabel>
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
            Voltar
          </Button>
        )}
        {isLastStep ? (
          <Button type="button" onClick={handleSubmit}>
            Criar cliente
          </Button>
        ) : (
          <Button type="button" onClick={handleNext}>
            Próximo
          </Button>
        )}
      </Field>
    </div>
  )
}
